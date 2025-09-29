// Type declaration for Float16Array support in TypeScript 4.5.5
declare global {
  /**
   * A typed array of 16-bit float values. The contents are initialized to 0.
   */
  interface Float16Array extends ArrayLike<number> {
    readonly BYTES_PER_ELEMENT: number;
    readonly buffer: ArrayBufferLike;
    readonly byteLength: number;
    readonly byteOffset: number;
    readonly length: number;

    [index: number]: number;

    copyWithin(target: number, start: number, end?: number): this;
    every(predicate: (value: number, index: number, array: Float16Array) => unknown, thisArg?: any): boolean;
    fill(value: number, start?: number, end?: number): this;
    filter(predicate: (value: number, index: number, array: Float16Array) => any, thisArg?: any): Float16Array;
    find(predicate: (value: number, index: number, obj: Float16Array) => boolean, thisArg?: any): number | undefined;
    findIndex(predicate: (value: number, index: number, obj: Float16Array) => boolean, thisArg?: any): number;
    forEach(callbackfn: (value: number, index: number, array: Float16Array) => void, thisArg?: any): void;
    indexOf(searchElement: number, fromIndex?: number): number;
    join(separator?: string): string;
    lastIndexOf(searchElement: number, fromIndex?: number): number;
    map(callbackfn: (value: number, index: number, array: Float16Array) => number, thisArg?: any): Float16Array;
    reduce(callbackfn: (previousValue: number, currentValue: number, currentIndex: number, array: Float16Array) => number): number;
    reduce<U>(callbackfn: (previousValue: U, currentValue: number, currentIndex: number, array: Float16Array) => U, initialValue: U): U;
    reduceRight(callbackfn: (previousValue: number, currentValue: number, currentIndex: number, array: Float16Array) => number): number;
    reduceRight<U>(callbackfn: (previousValue: U, currentValue: number, currentIndex: number, array: Float16Array) => U, initialValue: U): U;
    reverse(): Float16Array;
    set(array: ArrayLike<number>, offset?: number): void;
    slice(start?: number, end?: number): Float16Array;
    some(predicate: (value: number, index: number, array: Float16Array) => unknown, thisArg?: any): boolean;
    sort(compareFn?: (a: number, b: number) => number): this;
    subarray(begin?: number, end?: number): Float16Array;
    toLocaleString(): string;
    toString(): string;
    valueOf(): Float16Array;
    [Symbol.iterator](): IterableIterator<number>;
    entries(): IterableIterator<[number, number]>;
    keys(): IterableIterator<number>;
    values(): IterableIterator<number>;
  }

  interface Float16ArrayConstructor {
    readonly prototype: Float16Array;
    new(length: number): Float16Array;
    new(array: ArrayLike<number> | ArrayBufferLike): Float16Array;
    new(buffer: ArrayBufferLike, byteOffset?: number, length?: number): Float16Array;
    readonly BYTES_PER_ELEMENT: number;
    of(...items: number[]): Float16Array;
    from(arrayLike: ArrayLike<number>): Float16Array;
    from<T>(arrayLike: ArrayLike<T>, mapfn: (v: T, k: number) => number, thisArg?: any): Float16Array;
  }

  var Float16Array: Float16ArrayConstructor;
}

export {};