from pydantic import BaseModel


class NotificationCounts(BaseModel):
    new_orders: int
    unread_reviews: int
    pending_cancellations: int
    unread_messages: int
