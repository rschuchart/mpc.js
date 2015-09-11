/// <reference path="../typings/es6-map.d.ts" />

/**
 * The current status of the player.
 */
export class MPDStatus {
	
	/**
	 * "play", "stop", or "pause""
	 */
	state: string;
	
	/**
	 * index of the currently playing song within the playlist
	 */
	song: number;
	
	/**
	 * Playlist songid of the currently playing song
	 */
	songId: number;
	
	/**
	 * Total time (in seconds) elapsed within the current song
	 */
	elapsed: number;

	/**
	 * 0-100
	 */
	volume: number;
	playlistVersion: number;
	playlistLength: number;

	repeat: boolean;
	random: boolean;
	single: boolean;
	consume: boolean;

	/**
	 * Instantaneous bitrate in kbps
	 */
	bitrate: number;
	
	/**
	 * sampleRate:bits:channels
	 */
	audio: string;
	
	constructor(valueMap: Map<string, string>) {
		this.state = valueMap.get('state');
		this.song = Number(valueMap.get('song'));
		this.songId = Number(valueMap.get('songid'));
		this.elapsed = Number(valueMap.get('elapsed'));
		this.volume = Number(valueMap.get('volume'));
		this.playlistVersion = Number(valueMap.get('playlist'));
		this.playlistLength = Number(valueMap.get('playlistlength'));
		this.repeat = Boolean(Number(valueMap.get('repeat')));
		this.random = Boolean(Number(valueMap.get('random')));
		this.single = Boolean(Number(valueMap.get('single')));
		this.consume = Boolean(Number(valueMap.get('consume')));
		this.bitrate = Number(valueMap.get('bitrate'));
		this.audio = valueMap.get('audio');
	}
}

/**
 * The types of objects in the music database
 */
export enum MPDDirectoryEntryType { Directory, MusicFile, Playlist }

/**
 * Base class for objects in the music database.
 */
export class MPDDirectoryEntry {

	path: string;
	lastModified: Date;
	entryType: MPDDirectoryEntryType;

	static fromValueMap(valueMap: Map<string, string>): MPDDirectoryEntry {
		if (valueMap.get('file')) {
			return new MPDMusicFile(valueMap);
		} else if (valueMap.get('directory')) {
			return new MPDDirectory(valueMap);
		} else if (valueMap.get('playlist')) {
			return new MPDPlaylist(valueMap);
		}
	}

	/**
	 * Get the file/directory name from the path of this object
	 */	
	getName(): string {
		var separatorIndex = this.path.lastIndexOf('/');
		if (separatorIndex >= 0) {
			return this.path.substring(separatorIndex + 1);
		} else {
			return this.path;
		}
	}
	
	/**
	 * Get the BasePath of this object
	 */	
	getBasePath(): string {
		var separatorIndex = this.path.lastIndexOf('/');
		if (separatorIndex >= 0) {
			return this.path.substring(0, separatorIndex);
		} else {
			return '';
		}
	}
}

/**
 * Metadata for a music file.
 */
export class MPDMusicFile extends MPDDirectoryEntry {

	title: string;
	artist: string;
	album: string;
	albumArtist: string;
	date: string;
	genre: string;
	duration: number;
	
	constructor(valueMap: Map<string, string>) {
		super();
		this.path = valueMap.get('file');
		this.lastModified = new Date(valueMap.get('Last-Modified'));
		this.title = valueMap.get('Title');
		this.artist = valueMap.get('Artist');
		this.album = valueMap.get('Album');
		this.albumArtist = valueMap.get('AlbumArtist');
		this.date = valueMap.get('Date');
		this.genre = valueMap.get('Genre');
		this.duration = Number(valueMap.get('Time'));
		this.entryType = MPDDirectoryEntryType.MusicFile;
		
		if (!this.title && this.path) {
			var filename = this.getName();
			var suffixIndex = filename.lastIndexOf('.');
			if (suffixIndex > 0) {
				this.title = filename.substring(0, suffixIndex);
			} else {
				this.title = filename;
			}
		}
	}
}

/**
 * Metadata for a directory.
 */
export class MPDDirectory extends MPDDirectoryEntry {

	constructor(valueMap: Map<string, string>) {
		super();
		this.path = valueMap.get('directory');
		this.lastModified = new Date(valueMap.get('Last-Modified'));
		this.entryType = MPDDirectoryEntryType.Directory;
	}
}

/**
 * Metadata for a playlist file.
 */
export class MPDPlaylist extends MPDDirectoryEntry {

	constructor(valueMap: Map<string, string>) {
		super();
		this.path = valueMap.get('playlist');
		this.lastModified = new Date(valueMap.get('Last-Modified'));
		this.entryType = MPDDirectoryEntryType.Playlist;
	}
}

/**
 * An entry in a playlist.
 */
export class MPDPlaylistItem {

	id: number;
	position: number;	
	title: string;
	artist: string;
	album: string;
	albumArtist: string;
	date: string;
	genre: string;
	duration: number;
	path: string;
	lastModified: Date;
	
	constructor(valueMap: Map<string, string>) {
		this.id = Number(valueMap.get('Id'));
		this.position = Number(valueMap.get('Pos'));
		this.title = valueMap.get('Title');
		this.artist = valueMap.get('Artist');
		this.album = valueMap.get('Album');
		this.albumArtist = valueMap.get('AlbumArtist');
		this.date = valueMap.get('Date');
		this.genre = valueMap.get('Genre');
		this.duration = Number(valueMap.get('Time'));
		this.path = valueMap.get('file');
		this.lastModified = new Date(valueMap.get('Last-Modified'));
		
		if (!this.title && this.path) {
			var filename = this.path;
			
			var separatorIndex = this.path.lastIndexOf('/');
			if (separatorIndex >= 0) {
				filename = filename.substring(separatorIndex + 1);
			}
			
			var suffixIndex = filename.lastIndexOf('.');
			if (suffixIndex > 0) {
				this.title = filename.substring(0, suffixIndex);
			} else {
				this.title = filename;
			}
		}
	}
}

/**
 * Metadata for a stored playlist.
 */
export class MPDStoredPlaylist {

	name: string
	lastModified: Date;

	constructor(valueMap: Map<string, string>) {
		this.name = valueMap.get('playlist');
		this.lastModified = new Date(valueMap.get('Last-Modified'));
	}
}
