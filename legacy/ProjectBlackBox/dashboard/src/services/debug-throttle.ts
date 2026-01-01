// Simple test to debug the toString() behavior
export {}; // Make this a module

const callback = () => console.log('test');
console.log('Callback toString():', callback.toString());

// Test object storage with toString as key
const obj: Record<string, any> = {};
obj[callback.toString()] = 'test value';
console.log('Object with callback as key:', obj);
console.log('Retrieved value:', obj[callback.toString()]);

// Test with a different callback with same implementation
const callback2 = () => console.log('test');
console.log('Callback2 toString():', callback2.toString());
console.log('Are callbacks equal?', callback === callback2);
console.log('Are toString results equal?', callback.toString() === callback2.toString());
console.log('Retrieved with callback2:', obj[callback2.toString()]);
