// Type declarations for service modules

declare module './services/TelemetryService' {
  export class TelemetryService {
    initialize(): Promise<void>;
    start(): void;
    stop(): void;
    isActive(): boolean;
    getStats(): any;
    updateSettings(settings: any): void;
  }
}

declare module './services/DriverIdentificationService' {
  export class DriverIdentificationService {
    initialize(): Promise<void>;
    getCurrentDriver(): any;
    getAllDrivers(): any[];
    getDriver(id: string): any;
    updateDriver(id: string, updates: any): any;
    setCurrentDriver(driver: any): void;
    updateSettings(settings: any): void;
  }
}

declare module './services/DataTransmissionService' {
  export class DataTransmissionService {
    initialize(): Promise<void>;
    testConnection(url: string): Promise<boolean>;
    updateSettings(settings: any): void;
  }
}

declare module './services/VideoCapture' {
  export class VideoCapture {
    initialize(): Promise<void>;
    start(): void;
    stop(): void;
    updateSettings(settings: any): void;
  }
}

declare module './config/AppConfig' {
  export class AppConfig {
    static load(): void;
    static update(settings: any): void;
    static getAutoStart(): boolean;
    static getVideoEnabled(): boolean;
    static getVideoSettings(): any;
  }
}
