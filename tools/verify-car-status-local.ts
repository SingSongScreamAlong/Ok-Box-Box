import { createServer } from 'http';
import { io as createClient, Socket } from 'socket.io-client';
import { initializeWebSocket } from '../packages/server/src/websocket/index.ts';

const HOST = '127.0.0.1';
const REQUESTED_PORT = parseInt(process.env.LOCAL_CAR_STATUS_PORT || '0', 10);
const SESSION_ID = 'local_car_status_validation';

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function buildTelemetryPacket(seq: number) {
  return {
    sessionId: SESSION_ID,
    sessionTimeMs: seq * 1000,
    trackName: 'Sebring International Raceway',
    sessionType: 'race',
    trackTemp: 32,
    airTemp: 24,
    humidity: 0.42,
    windSpeed: 3,
    windDir: 0.4,
    sessionLaps: 90,
    sessionTimeRemain: 3600 - seq,
    cars: [
      {
        carIdx: 1,
        carId: 1,
        driverId: '1',
        driverName: 'Local Test Driver',
        carNumber: '1',
        isPlayer: true,
        position: 2,
        classPosition: 2,
        lap: 5 + seq,
        lapsCompleted: 5 + seq,
        lapDistPct: 0.45,
        pos: { s: 0.45 },
        speed: 62,
        gear: 4,
        rpm: 6450,
        throttle: 0.72,
        brake: 0.04,
        clutch: 0,
        steeringAngle: 0.03,
        lastLapTime: 120.4,
        bestLapTime: 119.9,
        deltaToSessionBest: 0.5,
        deltaToOptimalLap: 0.2,
        fuelLevel: 41.3,
        fuelPct: 0.58,
        fuelUsePerHour: 6.2,
        tireWearRaw: {
          LF: [0.94, 0.93, 0.92],
          RF: [0.95, 0.94, 0.93],
          LR: [0.96, 0.95, 0.94],
          RR: [0.95, 0.94, 0.93],
        },
        tireTempsRaw: {
          LF: [82, 84, 83],
          RF: [83, 85, 84],
          LR: [79, 80, 81],
          RR: [80, 81, 82],
        },
        oilTemp: 103,
        oilPress: 55,
        waterTemp: 91,
        voltage: 13.8,
        brakeBias: 55,
        onPitRoad: false,
        isOnTrack: true,
        incidentCount: 1,
        estTime: 101.2,
        f2Time: -1.8,
      },
      {
        carIdx: 2,
        carId: 2,
        driverId: '2',
        driverName: 'Car Ahead',
        carNumber: '7',
        isPlayer: false,
        position: 1,
        classPosition: 1,
        lap: 5 + seq,
        lapsCompleted: 5 + seq,
        lapDistPct: 0.48,
        pos: { s: 0.48 },
        onPitRoad: false,
        lastLapTime: 119.8,
        bestLapTime: 119.4,
        estTime: 99.7,
        f2Time: -0.5,
      },
      {
        carIdx: 3,
        carId: 3,
        driverId: '3',
        driverName: 'Car Behind',
        carNumber: '12',
        isPlayer: false,
        position: 3,
        classPosition: 3,
        lap: 5 + seq,
        lapsCompleted: 5 + seq,
        lapDistPct: 0.43,
        pos: { s: 0.43 },
        onPitRoad: false,
        lastLapTime: 120.8,
        bestLapTime: 120.2,
        estTime: 102.6,
        f2Time: 0.8,
      },
    ],
    standings: [
      {
        carIdx: 2,
        carId: 2,
        carNumber: '7',
        driverName: 'Car Ahead',
        position: 1,
        lapDistPct: 0.48,
        lap: 5 + seq,
        lastLapTime: 119.8,
        bestLapTime: 119.4,
        onPitRoad: false,
        isPlayer: false,
        gapToLeader: 0,
        estTime: 99.7,
      },
      {
        carIdx: 1,
        carId: 1,
        carNumber: '1',
        driverName: 'Local Test Driver',
        position: 2,
        lapDistPct: 0.45,
        lap: 5 + seq,
        lastLapTime: 120.4,
        bestLapTime: 119.9,
        onPitRoad: false,
        isPlayer: true,
        gapToLeader: 1.5,
        estTime: 101.2,
      },
      {
        carIdx: 3,
        carId: 3,
        carNumber: '12',
        driverName: 'Car Behind',
        position: 3,
        lapDistPct: 0.43,
        lap: 5 + seq,
        lastLapTime: 120.8,
        bestLapTime: 120.2,
        onPitRoad: false,
        isPlayer: false,
        gapToLeader: 2.9,
        estTime: 102.6,
      },
    ],
  };
}

async function main() {
  const httpServer = createServer();
  initializeWebSocket(httpServer);

  await new Promise<void>((resolve) => {
    httpServer.listen(REQUESTED_PORT, HOST, () => resolve());
  });

  const address = httpServer.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to resolve local websocket server address');
  }
  const URL = `http://${HOST}:${address.port}`;

  console.log(`[local-test] websocket server listening on ${URL}`);

  let gotSessionActive = false;
  let gotTelemetryUpdate = false;
  let gotTelemetryDriver = false;
  let gotCarStatus = false;
  let settled = false;

  const cleanup = async (exitCode: number) => {
    if (settled) return;
    settled = true;
    await Promise.allSettled([
      new Promise<void>((resolve) => viewer.close().on('disconnect', () => resolve())),
      new Promise<void>((resolve) => relay.close().on('disconnect', () => resolve())),
    ]).catch(() => undefined);
    await new Promise<void>((resolve) => ioClose(resolve));
    process.exitCode = exitCode;
  };

  const ioClose = (resolve: () => void) => {
    try {
      httpServer.close(() => resolve());
    } catch {
      resolve();
    }
  };

  const viewer: Socket = createClient(URL, {
    transports: ['websocket'],
    timeout: 5000,
  });

  viewer.on('connect', () => {
    console.log('[local-test] viewer connected');
    viewer.emit('dashboard:join', { type: 'driver' });
  });

  viewer.on('session:active', (data) => {
    gotSessionActive = true;
    console.log('[local-test] session:active', JSON.stringify(data));
    if (data?.sessionId) {
      viewer.emit('room:join', { sessionId: data.sessionId });
    }
  });

  viewer.on('telemetry_update', (data) => {
    gotTelemetryUpdate = true;
    console.log('[local-test] telemetry_update', JSON.stringify({
      speed: data?.speed,
      racePosition: data?.racePosition,
      totalCars: data?.totalCars,
    }));
  });

  viewer.on('telemetry:driver', (data) => {
    gotTelemetryDriver = true;
    console.log('[local-test] telemetry:driver', JSON.stringify({
      sessionId: data?.sessionId,
      cars: data?.cars?.length,
      standings: data?.standings?.length,
    }));
  });

  viewer.on('car:status', async (data) => {
    gotCarStatus = true;
    console.log('[local-test] car:status', JSON.stringify({
      fuelLevel: data?.fuel?.level,
      fuelStatus: data?.fuel?.status,
      gapAhead: data?.gaps?.toCarAhead,
      gapBehind: data?.gaps?.fromCarBehind,
      weather: data?.weather,
    }));
    await cleanup(0);
  });

  viewer.on('connect_error', (error) => {
    console.error('[local-test] viewer connect_error', error.message);
  });

  const relay: Socket = createClient(URL, {
    transports: ['websocket'],
    timeout: 5000,
    auth: {
      relayId: 'local-test-relay',
    },
  });

  relay.on('connect', async () => {
    console.log('[local-test] relay connected');
    relay.emit('session_metadata', {
      sessionId: SESSION_ID,
      trackName: 'Sebring International Raceway',
      sessionType: 'race',
      trackLength: '6.02 km',
      rpmRedline: 7000,
      fuelTankCapacity: 70,
      carName: 'GT3',
    });

    await wait(150);

    for (let i = 0; i < 3; i++) {
      relay.emit('telemetry', buildTelemetryPacket(i));
      await wait(250);
    }
  });

  relay.on('connect_error', (error) => {
    console.error('[local-test] relay connect_error', error.message);
  });

  setTimeout(async () => {
    console.error('[local-test] timeout', JSON.stringify({
      gotSessionActive,
      gotTelemetryUpdate,
      gotTelemetryDriver,
      gotCarStatus,
    }));
    await cleanup(gotCarStatus ? 0 : 1);
  }, 8000);
}

main().catch((error) => {
  console.error('[local-test] fatal', error);
  process.exit(1);
});
