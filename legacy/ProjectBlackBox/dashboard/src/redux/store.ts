import { configureStore } from '@reduxjs/toolkit';
import driversReducer from './slices/driversSlice';

export const store = configureStore({
  reducer: {
    drivers: driversReducer,
    // Add other reducers here as needed
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
