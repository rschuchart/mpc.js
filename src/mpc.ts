/// <reference path="../typings/es6-promise.d.ts" />
/// <reference path="../typings/es6-map.d.ts" />
import { SocketWrapper, MPDProtocol } from './mpd-protocol';
import { MPDStatus, MPDDirectoryEntryType, MPDDirectoryEntry, MPDDirectory, MPDMusicFile, MPDPlaylistItem, MPDStoredPlaylist } from './mpd-objects';

export class MPC extends MPDProtocol {
	
	constructor(connection: SocketWrapper) {
		super(connection);
	}

	getStatus(): Promise<MPDStatus> {
		return this.sendCommand('status').then(
			(msg) => this.parse<MPDStatus>(msg, [], (valueMap) => new MPDStatus(valueMap))[0]);
	}
	
	getCurrentPlaylist(): Promise<MPDPlaylistItem[]> {
		return this.sendCommand('playlistinfo').then(
			(msg) => this.parse<MPDPlaylistItem>(msg, ['file'], (valueMap) => new MPDPlaylistItem(valueMap)));
	}
	
	addToCurrentPlaylist(path: string, index: number = -1) {
		var cmdString = 'addid "' + path + '"';
		if (index >= 0) {
			cmdString += ' ' + index;
		}
		this.sendCommand(cmdString);
	}
	
	removeFromCurrentPlaylist(index: number) {
		this.sendCommand('delete ' + index);
	}
	
	moveInCurrentPlaylist(sourceIndices: number[], targetIndex: number) {
		for (var i = 0; i < sourceIndices.length; i++) {
			var sourceIndex = sourceIndices[i];
			if (sourceIndex < targetIndex) {
				sourceIndex -= i;
				targetIndex--;
			}
			this.sendCommand('move ' + sourceIndex + " " + targetIndex);
			targetIndex++;
		}
	}
	
	clearCurrentPlaylist() {
		this.sendCommand('clear');
	}

	play() {
		this.sendCommand('play');
	}

	pause() {
		this.sendCommand('pause');
	}

	stop() {
		this.sendCommand('stop');
	}

	previous() {
		this.sendCommand('previous');
	}

	next() {
		this.sendCommand('next');
	}
	
	goto(index: number) {
		this.sendCommand('play ' + index);
	}
    
    seek(time: number) {
        this.sendCommand('seekcur ' + time);
    }

	search(what: string): Promise<MPDMusicFile[]> {
		return this.sendCommand('search any ' + what).then((msg) => 
			this.parse<MPDMusicFile>(msg, ['file'], (valueMap) => new MPDMusicFile(valueMap)));
	}

	getDirectory(path: string): Promise<MPDDirectoryEntry[]> {
		return this.sendCommand('lsinfo "' + path + '"').then((msg) =>
			this.parse<MPDDirectoryEntry>(msg, ['file', 'directory', 'playlist'], 
				(valueMap) => MPDDirectoryEntry.fromValueMap(valueMap)));
	}

	getFilesInDirectory(directoryPath: string, recurseLevels: number = 0): Promise<MPDMusicFile[]> {
		return this.getDirectory(directoryPath).then((entries) => {
			var files: MPDMusicFile[] = [];
			var directoryPromises: Promise<MPDMusicFile[]>[] = [];
			entries.forEach(entry => {
				if (entry.entryType == MPDDirectoryEntryType.MusicFile) {
					files.push(<MPDMusicFile>entry);
				} else if (entry.entryType == MPDDirectoryEntryType.Directory) {
					if (recurseLevels != 0) {
						directoryPromises.push(this.getFilesInDirectory(entry.path, recurseLevels - 1));
					}
				}
			});
			
			return Promise.all(directoryPromises).then((filesFromSubDirectories) => {
				filesFromSubDirectories.forEach((moreFiles) => {
					files = files.concat(moreFiles);
				});
				return files;
			});
		});
	}

	getPlaylist(nameOrPath: string): Promise<MPDMusicFile[]> {
		return this.sendCommand('listplaylistinfo "' + nameOrPath + '"').then((msg) => 
			this.parse<MPDMusicFile>(msg, ['file'], valueMap => new MPDMusicFile(valueMap)));
	}
	
	getStoredPlaylists(): Promise<MPDStoredPlaylist[]> {
		return this.sendCommand('listplaylists').then((msg) => 
			this.parse<MPDStoredPlaylist>(msg, ['playlist'], (valueMap) => new MPDStoredPlaylist(valueMap)));
	}

	removeStoredPlaylist(name: string) {
		this.sendCommand('rm "' + name + '"');
	}

	loadStoredPlaylist(name: string) {
		this.sendCommand('load "' + name + '"');
	}
	
	storeCurrentPlaylist(name: string) {
		this.sendCommand('save "' + name + '"');
	}

	update(directory?: MPDDirectory) {
		var cmdString = 'update';
		if (directory) {
			cmdString += ' "' + directory.path + '"';
		}
		this.sendCommand(cmdString);
	}
	
	rescan(directory?: MPDDirectory) {
		var cmdString = 'rescan';
		if (directory) {
			cmdString += ' "' + directory.path + '"';
		}
		this.sendCommand(cmdString);
	}
	
	parse<T>(lines: string[], markers: string[], convert: (valueMap: Map<string, string>) => T): T[] {
		var result = new Array<T>();
		var currentValueMap = new Map<string, string>();
		var lineCount = 0;

		lines.forEach((line) => {
			var colonIndex = line.indexOf(':');
			if (colonIndex > 0) {
				var key = line.substring(0, colonIndex);
				var value = line.substring(colonIndex + 2);
				if ((lineCount > 0) && markers.some(marker => (marker == key))) {
					result.push(convert(currentValueMap));
					currentValueMap = new Map<string, string>();
				}
				currentValueMap.set(key, value);
				lineCount++;
			} else {
				console.log('Huh? "' + line + '" at line ' + lineCount);
			}
		});
		if (lineCount > 0) {
			result.push(convert(currentValueMap));
		}

		return result;
	}	

}

