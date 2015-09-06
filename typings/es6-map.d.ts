interface IteratorResult<T> {
    done: boolean;
    value?: T;
}
interface Iterator<T> {
    //[Symbol.iterator](): Iterator<T>;
    next(): IteratorResult<T>;
}
interface Iterable<T> {
  //[Symbol.iterator](): Iterator<T>;
}
interface Map<K, V> {
    clear(): void;
    delete(key: K): boolean;
    entries(): Iterator<[K, V]>;
    forEach(callbackfn: (value: V, index: K, map: Map<K, V>) => void, thisArg?: any): void;
    get(key: K): V;
    has(key: K): boolean;
    keys(): Iterator<K>;
    set(key: K, value?: V): Map<K, V>;
    size: number;
    values(): Iterator<V>;
    // [Symbol.iterator]():Iterator<[K,V]>;
    // [Symbol.toStringTag]: string;
}
interface MapConstructor {
    new <K, V>(): Map<K, V>;
    new <K, V>(iterable: Iterable<[K, V]>): Map<K, V>;
    prototype: Map<any, any>;
}
declare var Map: MapConstructor;
