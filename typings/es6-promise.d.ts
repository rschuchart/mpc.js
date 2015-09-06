interface Promise<T> {
    then<TResult>(onfulfilled?: (value: T) => TResult | Promise<TResult>, onrejected?: (reason: any) => TResult | Promise<TResult>): Promise<TResult>;
    catch(onrejected?: (reason: any) => T | Promise<T>): Promise<T>;
}
interface PromiseConstructor {
    prototype: Promise<any>;
    new <T>(init: (resolve: (value?: T | Promise<T>) => void, reject: (reason?: any) => void) => void): Promise<T>;
    <T>(init: (resolve: (value?: T | Promise<T>) => void, reject: (reason?: any) => void) => void): Promise<T>;
    all<T>(values: (T | Promise<T>)[]): Promise<T[]>;
    all(values: Promise<void>[]): Promise<void>;
    race<T>(values: (T | Promise<T>)[]): Promise<T>;
    reject(reason: any): Promise<void>;
    reject<T>(reason: any): Promise<T>;
    resolve<T>(value: T | Promise<T>): Promise<T>;
    resolve(): Promise<void>;
}
declare var Promise: PromiseConstructor;
