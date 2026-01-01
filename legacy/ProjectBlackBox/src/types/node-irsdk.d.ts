declare module 'node-irsdk' {
  export interface JsIrSdk {
    init(opts: any): void;
    shutdown(): void;
    getTelemetry(): any;
    on(event: string, callback: (data: any) => void): void;
  }
  
  export function getInstance(): JsIrSdk;
}
