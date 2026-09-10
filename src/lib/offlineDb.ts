import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Order, PrintJob } from '../types';

interface PrintFoodDB extends DBSchema {
  orders: {
    key: string;
    value: Order;
  };
  printJobs: {
    key: string;
    value: PrintJob;
  };
}

const DB_NAME = 'PrintFoodOfflineDB';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<PrintFoodDB>>;

export function getDB(): Promise<IDBPDatabase<PrintFoodDB>> {
  if (!dbPromise) {
    dbPromise = openDB<PrintFoodDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('orders', { keyPath: 'id' });
        db.createObjectStore('printJobs', { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
}

export async function saveOrderOffline(order: Order) {
  const db = await getDB();
  await db.put('orders', order);
}

export async function getOrdersOffline(): Promise<Order[]> {
  const db = await getDB();
  return db.getAll('orders');
}

export async function savePrintJobOffline(job: PrintJob) {
  const db = await getDB();
  await db.put('printJobs', job);
}

export async function getPrintJobsOffline(): Promise<PrintJob[]> {
  const db = await getDB();
  return db.getAll('printJobs');
}
