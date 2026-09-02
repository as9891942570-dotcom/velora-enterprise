import enum


class UserRole(str, enum.Enum):
    CUSTOMER = "customer"
    ADMIN = "admin"


class AddressType(str, enum.Enum):
    HOME = "home"
    WORK = "work"
    OTHER = "other"


class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    RETURNED = "returned"


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"
    COD_PENDING = "cod_pending"


class PaymentMethod(str, enum.Enum):
    ONLINE = "online"
    UPI = "upi"
    CARD = "card"
    NETBANKING = "netbanking"
    COD = "cod"


class PaymentRecordStatus(str, enum.Enum):
    CREATED = "created"
    AUTHORIZED = "authorized"
    CAPTURED = "captured"
    FAILED = "failed"
    REFUNDED = "refunded"


class ContactMessageStatus(str, enum.Enum):
    UNREAD = "unread"
    READ = "read"
    RESOLVED = "resolved"


class CancelledByRole(str, enum.Enum):
    CUSTOMER = "customer"
    ADMIN = "admin"
    SYSTEM = "system"
