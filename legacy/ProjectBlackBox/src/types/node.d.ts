// Type declarations for Node.js built-in modules
declare module 'path' {
  export function join(...paths: string[]): string;
  export function resolve(...paths: string[]): string;
  export function dirname(path: string): string;
  export function basename(path: string, ext?: string): string;
  export function extname(path: string): string;
}

declare module 'fs' {
  export function readFileSync(path: string, options?: { encoding?: string; flag?: string } | string): string | Buffer;
  export function writeFileSync(path: string, data: string | Buffer, options?: { encoding?: string; mode?: number; flag?: string } | string): void;
  export function existsSync(path: string): boolean;
  export function mkdirSync(path: string, options?: { recursive?: boolean; mode?: number } | number): string | undefined;
  export function readdirSync(path: string, options?: { encoding?: string; withFileTypes?: boolean } | string): string[] | any[];
  export function unlinkSync(path: string): void;
  export function statSync(path: string): { isDirectory(): boolean; isFile(): boolean; size: number; mtime: Date; };
  
  export function readFile(path: string, options: { encoding?: string; flag?: string } | string, callback: (err: Error | null, data: string | Buffer) => void): void;
  export function readFile(path: string, callback: (err: Error | null, data: Buffer) => void): void;
  export function writeFile(path: string, data: string | Buffer, options: { encoding?: string; mode?: number; flag?: string } | string, callback: (err: Error | null) => void): void;
  export function writeFile(path: string, data: string | Buffer, callback: (err: Error | null) => void): void;
  export function mkdir(path: string, options: { recursive?: boolean; mode?: number } | number, callback: (err: Error | null, path?: string) => void): void;
  export function mkdir(path: string, callback: (err: Error | null) => void): void;
}
