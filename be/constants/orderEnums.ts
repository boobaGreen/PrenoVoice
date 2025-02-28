// Enum per gli stati dell'ordine
export enum OrderStatus {
    PENDING = 'pending',
    CONFIRMED = 'confirmed',
    PREPARING = 'preparing',
    READY = 'ready',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled'
}

// Enum per i motivi di cancellazione
export enum CancellationReason {
    CUSTOMER_REQUEST = 'customer_request',
    OUT_OF_STOCK = 'out_of_stock',
    STORE_CLOSED = 'store_closed',
    TECHNICAL_ISSUES = 'technical_issues',
    OTHER = 'other'
}