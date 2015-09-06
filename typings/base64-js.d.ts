declare module Base64JS {
	function fromByteArray(bytes: Uint8Array): string;
	function toByteArray(str: string): Uint8Array;
}
declare module 'base64-js' {
	export = Base64JS;
}
