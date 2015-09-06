/// <reference path="../typings/es6-promise.d.ts" />

export class MPDProtocol {

	private static failureRegExp = /ACK \[([0-9]+)@[0-9]+\] \{[^\}]*\} (.*)/;
	
	private connection: SocketWrapper;
	private observers: MPDObserver[];

	private initialising: boolean;
	private idle: boolean;
	private runningRequests: MPDRequest[];
	private queuedRequests: MPDRequest[];
	private receivedLines: string[];
	
	mpdMajorVersion: number;
	mpdMinorVersion: number;
	mpdPatchVersion: number;

	constructor(connection: SocketWrapper) {
		this.connection = connection;
		this.connection.connect((msg) => this.processReceivedMessage(msg));
		this.initialising = true;
		this.idle = false;
		this.queuedRequests = [];
		this.observers = [];
		this.receivedLines = [];
	}

	registerObserver(observer: MPDObserver) {
		this.observers.push(observer);
	}
	
	unregisterObserver(observer: MPDObserver) {
		var index = this.observers.indexOf(observer);
		if (index >= 0) {
			this.observers.splice(index, 1);
		}
	}
	
	sendCommand(cmd: string): Promise<string[]> {
		return new Promise<string[]>((resolve, reject) => {
			var mpdRequest = new MPDRequest(cmd, (lines: string[]) => resolve(lines), (mpdError: MPDError) => reject(mpdError));
			this.enqueueRequest(mpdRequest);
		});
	}

	private enqueueRequest(mpdRequest: MPDRequest) {
		this.queuedRequests.push(mpdRequest);
		if (this.idle) {
			this.connection.send('noidle\n');
			this.idle = false;
		}
	}
	
	private processReceivedMessage(msg: string) {
		if (this.initialising) {
			this.initialCallback(msg.substring(0, msg.length - 1));
			this.initialising = false;
			this.dequeueRequests();
			return;
		}
		if (this.receivedLines.length > 0) {
			var lastPreviousLine = this.receivedLines.pop();
			msg = lastPreviousLine + msg;
		}
		var lines = msg.split('\n');
		for (var i = 0; i < (lines.length - 1); i++) {
			var line = lines[i];
			if ((line == 'list_OK') || (line == 'OK')) {
				if (this.runningRequests.length > 0) {
					var req = this.runningRequests.shift();
					req.onFulfilled(this.receivedLines);
					this.receivedLines = [];
				}
			} else if (stringStartsWith(line, 'ACK [')) {
				if (this.runningRequests.length > 0) {
					var req = this.runningRequests.shift();
					var match = MPDProtocol.failureRegExp.exec(line);
					if (match != null) {
						var mpdError: MPDError = { errorCode: Number(match[1]), errorMessage: match[2] };
						req.onRejected(mpdError);
						this.queuedRequests = this.runningRequests.concat(this.queuedRequests);
						this.runningRequests = [];
					} else {
						console.log('WTF? "' + line + '"');
					}
					this.receivedLines = [];
				}
			} else {
				this.receivedLines.push(line);
			}
		}
		this.receivedLines.push(lines[lines.length - 1]);
		if ((lines.length >= 2) && (lines[lines.length - 1] == '') && 
			((lines[lines.length - 2] == 'OK') || stringStartsWith(lines[lines.length - 2], 'ACK ['))) {
			this.dequeueRequests();
		}
	}

	private dequeueRequests() {
		if (this.queuedRequests.length > 0) {
			this.runningRequests = this.queuedRequests;
			this.queuedRequests = [];
			this.idle = false;
		} else {
			this.runningRequests = [new MPDRequest('idle', (lines) => this.idleCallback(lines))];
			this.idle = true;
		}
		var commandString: string;
		if (this.runningRequests.length == 1) {
			commandString = this.runningRequests[0].commandString + '\n';
		} else {
			commandString = 'command_list_ok_begin\n';
			this.runningRequests.forEach((command) => {
				commandString += command.commandString + '\n';
			});
			commandString += 'command_list_end\n';
		}
		this.connection.send(commandString);
	}
	
	private initialCallback(msg: string) {
		var match = /^OK MPD ([0-9]+)\.([0-9]+)\.([0-9]+)/.exec(msg);
		this.mpdMajorVersion = Number(match[1]);
		this.mpdMinorVersion = Number(match[2]);
		this.mpdPatchVersion = Number(match[3]);
	}

	private idleCallback(lines: string[]) {
		this.idle = false;
		var subsystems = lines.map(changed => changed.substring(9));
		if (subsystems.length > 0) {
			this.observers.forEach((observer) => observer.subsystemsChanged(subsystems));
		}
	}
}

export interface SocketWrapper {
	connect(receive: (msg: string) => void);
	send(msg: string): void;
}

export interface MPDObserver {
	subsystemsChanged: (subsystems: string[]) => void;
}

export class MPDError {
	errorCode: number;
	errorMessage: string;
}

class MPDRequest {
	
	commandString: string;
	onFulfilled: (lines: string[]) => void;
	onRejected: (error: MPDError) => void;
	
	constructor(commandString: string, onFulfilled: (lines: string[]) => void, onRejected?: (error: MPDError) => void) {
		this.commandString = commandString;
		this.onFulfilled = onFulfilled;
		this.onRejected = onRejected;
	}
}

function stringStartsWith(str: string, prefix: string): boolean {
	return ((str.length >= prefix.length) && (str.substring(0, prefix.length) == prefix));
}
