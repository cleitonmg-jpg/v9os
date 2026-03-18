export interface Client {
  id: number;
  name: string;
  cpfCnpj?: string;
  phone: string;
  email?: string;
  address?: string;
  vehicles?: Vehicle[];
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle {
  id: number;
  plate: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  chassis?: string;
  mileage: number;
  clientId: number;
  client?: Client;
  createdAt: string;
  updatedAt: string;
}

export interface OSItem {
  id?: number;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  type: 'SERVICE' | 'PART';
  technicianId?: number | null;
  technician?: Technician;
}

export interface OSBudget {
  id: number;
  number: number;
  type: 'BUDGET' | 'OS';
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'COMPLETED' | 'CANCELLED';
  date: string;
  clientId: number;
  client?: Client;
  vehicleId: number;
  vehicle?: Vehicle;
  defectReported?: string;
  totalAmount: number;
  items: OSItem[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Technician {
  id: number;
  username: string;
  name: string;
  role: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceItem {
  id: number;
  description: string;
  type: 'SERVICE' | 'PART';
  costPrice: number;
  unitPrice: number;
  stock: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Stats {
  openBudgets: number;
  completedOs: number;
  pendingAuth: number;
  activeVehicles: number;
  recentOs: OSBudget[];
}
