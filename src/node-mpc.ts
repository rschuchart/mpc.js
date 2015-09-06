/// <reference path="../typings/node.d.ts" />
import { Socket, connect } from 'net';
import { SocketWrapper } from './mpd-protocol';
import { MPC } from './mpc';

export function viaTcpSocket(hostname: string, port: number): MPC {
	return new MPC(new TcpSocketWrapper(hostname, port));
}

export function viaUnixSocket(path: string): MPC {
	return new MPC(new UnixSocketWrapper(path));
}

export function viaWebSocket(uri: string): MPC {
	return new MPC(new WebSocketWrapper(uri));
}

class WebSocketWrapper implements SocketWrapper {

	private uri: string;
	private wsClient: WebSocket;
	
	constructor(uri: string) {
		this.uri = uri;
	}

	connect(receive: (msg: string) => void) {
		this.wsClient = new WebSocket(this.uri, ['base64']);
		this.wsClient.onmessage = (e) => receive(new Buffer(e.data, 'base64').toString('utf8'));
	}
	
	send(msg: string) {
		this.wsClient.send(new Buffer(msg).toString('base64'));
	}
}

class TcpSocketWrapper implements SocketWrapper {
	
	private hostname: string;
	private port: number;
	private socket: Socket;
	
	constructor(hostname: string, port: number) {
		this.hostname = hostname;
		this.port = port;
	}
	
	connect(receive: (msg: string) => void) {
		this.socket = connect(this.port, this.hostname);
		this.socket.setEncoding('utf8');
		this.socket.on('data', (msg) => {
			receive(msg);
		});
	}
	
	send(msg: string): void {
		this.socket.write(msg);
	}
}

class UnixSocketWrapper implements SocketWrapper {
	
	private path: string;
	private socket: Socket;
	
	constructor(path: string) {
		this.path = path;
	}
	
	connect(receive: (msg: string) => void) {
		this.socket = connect(this.path);
		this.socket.setEncoding('utf8');
		this.socket.on('data', (msg) => {
			receive(msg);
		});
	}
	
	send(msg: string): void {
		this.socket.write(msg);
	}
}
