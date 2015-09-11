/// <reference path="../typings/es6-promise.d.ts" />
/// <reference path="../typings/es6-map.d.ts" />
import { SocketWrapper, MPDProtocol } from './mpd-protocol';
import { MPDStatus, MPDDirectoryEntryType, MPDDirectoryEntry, MPDDirectory, MPDMusicFile, MPDPlaylistItem, MPDStoredPlaylist } from './mpd-objects';

/**
 * Implements the [commands](http://www.musicpd.org/doc/protocol/command_reference.html)
 * of the [Music Player Daemon protocol](http://www.musicpd.org/doc/protocol/index.html)
 */
export class MPC extends MPDProtocol {
	
	/**
	 * Create an instance that connects to the daemon via the given connection.
	 */
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

	/**
	 * Add a song to the current playlist.
	 * @param path	The path of the song to add.
	 * @param index	The position within the current playlist where the song should be added.
	 * 				If no index (or a negative index) is given, the song will be added to the end
	 * 				of the playlist.
	 */
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

	/**
	 * Move a bunch of songs within the current playlist. The songs will be moved to the
	 * given target index in the order in which they currently appear in the playlist.
	 */
	moveInCurrentPlaylist(sourceIndices: number[], targetIndex: number) {
		sourceIndices.sort((a: number, b: number) => (a - b))
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
	
	/**
	 * Jump to the song with the given index and start playing.
	 */
	jump(index: number) {
		this.sendCommand('play ' + index);
	}

	/**
	 * Seek within the currently playing song.
	 * @param time	The position (in seconds, fractions allowed) to seek to.
	 */    
    seek(time: number) {
        this.sendCommand('seekcur ' + time);
    }

	/**
	 * Search the music database for songs that have a tag containing the given string.
	 * The search is case-insensitive.
	 */
	search(what: string): Promise<MPDMusicFile[]> {
		return this.sendCommand('search any ' + what).then((msg) => 
			this.parse<MPDMusicFile>(msg, ['file'], (valueMap) => new MPDMusicFile(valueMap)));
	}

	getDirectory(path: string): Promise<MPDDirectoryEntry[]> {
		return this.sendCommand('lsinfo "' + path + '"').then((msg) =>
			this.parse<MPDDirectoryEntry>(msg, ['file', 'directory', 'playlist'], 
				(valueMap) => MPDDirectoryEntry.fromValueMap(valueMap)));
	}

	/**
	 * Get the music files from the directory with the given path and its subdirectories.
	 * @param recurseLevels	The number of directory levels to recurse into. If no number (or 0) is given,
	 * 						only music files from the top directory are returned, if 1 is given, music
	 * 						files from the top directory and its immediate subdirectories are returned,
	 * 						and so on. If a negative number is given, the recursion is unlimited.
	 */
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

	/**
	 * Get the music files in a playlist
	 * @param nameOrPath	This is either the name of a playlist stored using [[storeCurrentPlaylist]]
	 * 						or the path of a playlist file in the music database.
	 */
	getPlaylist(nameOrPath: string): Promise<MPDMusicFile[]> {
		return this.sendCommand('listplaylistinfo "' + nameOrPath + '"').then((msg) => 
			this.parse<MPDMusicFile>(msg, ['file'], valueMap => new MPDMusicFile(valueMap)));
	}

	/**
	 * Get the metadata for all playlists stored using [[storeCurrentPlaylist]].
	 */	
	getStoredPlaylists(): Promise<MPDStoredPlaylist[]> {
		return this.sendCommand('listplaylists').then((msg) => 
			this.parse<MPDStoredPlaylist>(msg, ['playlist'], (valueMap) => new MPDStoredPlaylist(valueMap)));
	}

	/**
	 * Remove a playlist stored using [[storeCurrentPlaylist]]
	 */
	removeStoredPlaylist(name: string) {
		this.sendCommand('rm "' + name + '"');
	}

	/**
	 * Append a playlist stored using [[storeCurrentPlaylist]] to the current playlist.
	 */
	loadStoredPlaylist(name: string) {
		this.sendCommand('load "' + name + '"');
	}
	
	/**
	 * Store the current playlist.
	 */
	storeCurrentPlaylist(name: string) {
		this.sendCommand('save "' + name + '"');
	}

	/**
	 * Start updating the music database: find new files, remove deleted files, update modified files.
	 * @param directoryPath	Update only this directory and its subdirectories.
	 */
	update(directoryPath?: string) {
		var cmdString = 'update';
		if (directoryPath) {
			cmdString += ' "' + directoryPath + '"';
		}
		this.sendCommand(cmdString);
	}
	
	/**
	 * Start rescanning the music database. Same as [[update]], but also rescans unmodified files.
	 * @param directoryPath	Rescan only this directory and its subdirectories.
	 */
	rescan(directoryPath?: string) {
		var cmdString = 'rescan';
		if (directoryPath) {
			cmdString += ' "' + directoryPath + '"';
		}
		this.sendCommand(cmdString);
	}
}
