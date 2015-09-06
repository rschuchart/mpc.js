import { MPDProtocol, MPDObserver } from './mpd-protocol';
import { MPDStatus, MPDDirectoryEntry, MPDPlaylistItem, MPDStoredPlaylist } from './mpd-objects';
import { MPC } from './mpc';

class SimpleObservable {

	private observers: Array<() => void> = [];
	
	registerObserver(observer: () => void) {
		this.observers.push(observer);
	}
	
	unregisterObserver(observer: () => void) {
		this.observers = this.observers.filter(o => (o !== observer));
	}
	
	notifyObservers() {
		this.observers.forEach(o => o());
	}
}

export class LiveStatus extends SimpleObservable implements MPDObserver {

	private mpc: MPC;	
	mpdStatus: MPDStatus;

	constructor(mpc: MPC) {
		super();
		this.mpc = mpc;
		mpc.registerObserver(this);
		this.fetchStatus();
	}

	subsystemsChanged(subsystems: string[]) {
		var statusChanged = subsystems.some((subsystem) => 
			((subsystem == 'player') || (subsystem == 'options') || (subsystem == 'mixer') || (subsystem == 'playlist')));
		if (statusChanged) {
			this.fetchStatus();
		}
	}
	
	fetchStatus() {
		this.mpc.getStatus().then((mpdStatus) => {
			this.mpdStatus = mpdStatus;
			this.notifyObservers();
		});
	}
}

export class LiveCurrentPlaylist extends SimpleObservable implements MPDObserver {

	private mpc: MPC;	
	playlist: MPDPlaylistItem[];
	
	constructor(mpc: MPC) {
		super();
		this.mpc = mpc;
		mpc.registerObserver(this);
		this.fetchPlaylist();
	}

	subsystemsChanged(subsystems: string[]) {
		var statusChanged = subsystems.some((subsystem) => (subsystem == 'playlist'));
		if (statusChanged) {
			this.fetchPlaylist();
		}
	}
	
	fetchPlaylist() {
		this.mpc.getCurrentPlaylist().then((playlist) => {
			this.playlist = playlist;
			this.notifyObservers();
		});
	}
}

export class LiveStoredPlaylists extends SimpleObservable implements MPDObserver {

	private mpc: MPC;	
	storedPlaylists: MPDStoredPlaylist[];

	constructor(mpc: MPC) {
		super();
		this.mpc = mpc;
		mpc.registerObserver(this);
		this.fetchStoredPlaylists();
	}

	subsystemsChanged(subsystems: string[]) {
		var statusChanged = subsystems.some((subsystem) => (subsystem == 'stored_playlist'));
		if (statusChanged) {
			this.fetchStoredPlaylists();
		}
	}
	
	private fetchStoredPlaylists() {
		this.mpc.getStoredPlaylists().then((storedPlaylists) => {
			this.storedPlaylists = storedPlaylists;
			this.notifyObservers();
		});
	}
}

export class LiveDirectories implements MPDObserver {

	private mpc: MPC;	
	private directories: Map<string, MPDDirectoryEntry[]>;
	private observers: Array<(cause: string) => void> = [];
	
	registerObserver(observer: (cause: string) => void) {
		this.observers.push(observer);
	}
	
	unregisterObserver(observer: (cause: string) => void) {
		this.observers = this.observers.filter(o => (o !== observer));
	}
	
	notifyObservers(cause: string) {
		this.observers.forEach(o => o(cause));
	}
	
	constructor(mpc: MPC) {
		this.mpc = mpc;
		this.directories = new Map<string, MPDDirectoryEntry[]>();
		mpc.registerObserver(this);
	}

	subsystemsChanged(subsystems: string[]) {
		var statusChanged = subsystems.some((subsystem) => (subsystem == 'database'));
		if (statusChanged) {
			this.refetchDirectories();
		}
	}
	
	isWatching(path: string): boolean {
		return this.directories.has(path);
	}
	
	watch(path: string): Promise<MPDDirectoryEntry[]> {
		if (this.isWatching(path)) {
			return Promise.resolve(this.directories.get(path));
		} else {
			var promise = this.mpc.getDirectory(path);
			promise.then((directory) => {
				this.directories.set(path, directory);
				this.notifyObservers('watch');
			});
			return promise;
		}
	}
	
	unwatch(path: string) {
		if (this.isWatching(path)) {
			this.directories.delete(path);
			this.notifyObservers('unwatch');
		}
	}
	
	toggleWatch(path: string) {
		if (this.isWatching(path)) {
			this.unwatch(path);
		} else {
			this.watch(path);
		}
	}
	
	getWatchedDirectory(path: string): MPDDirectoryEntry[] {
		return this.directories.get(path);
	}
	
	private refetchDirectories() {

		var paths: string[] = [];
		this.directories.forEach((content, path) => {
			paths.push(path);
		});
		
		var promises = paths.map((path) => this.getDirectoryIfExists(path));
		
		Promise.all(promises).then((newDirectories) => {

			this.directories.clear();

			for (var i = 0; i < paths.length; i++) {
				if (newDirectories[i] !== undefined) {
					this.directories.set(paths[i], newDirectories[i]);
				}
			}
			
			this.notifyObservers('update');
		});
	}

	private getDirectoryIfExists(path: string): Promise<MPDDirectoryEntry[]> {
		var promise = this.mpc.getDirectory(path);
		return new Promise<MPDDirectoryEntry[]>((resolve, reject) => {
			promise.then(resolve, (reason) => resolve(undefined));
		});
	}
}
