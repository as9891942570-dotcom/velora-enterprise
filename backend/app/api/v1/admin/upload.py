import time



from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from pydantic import BaseModel, Field, field_validator



from app.core.config import settings

from app.core.deps import require_admin

from app.utils.image_storage import save_product_image, validate_public_image_url



router = APIRouter(dependencies=[Depends(require_admin)])





class UploadUrlRequest(BaseModel):

    url: str = Field(min_length=1, max_length=500)



    @field_validator("url")

    @classmethod

    def validate_url(cls, value: str) -> str:

        return validate_public_image_url(value)





class CloudinarySignResponse(BaseModel):

    cloud_name: str

    api_key: str

    timestamp: int

    signature: str

    folder: str = "velora/products"





class UploadResponse(BaseModel):

    url: str

    cloudinary_public_id: str | None = None





@router.post("/file", response_model=UploadResponse)
async def upload_product_image_file(

    file: UploadFile = File(...),

) -> UploadResponse:

    result = await save_product_image(file)

    return UploadResponse(
        url=result["url"],
        cloudinary_public_id=result["cloudinary_public_id"],
    )




@router.post("/sign", response_model=CloudinarySignResponse)

async def sign_cloudinary_upload() -> CloudinarySignResponse:

    if not settings.cloudinary_enabled:

        raise HTTPException(

            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,

            detail="Cloudinary is not configured. Upload images using the file upload endpoint.",

        )



    import cloudinary

    import cloudinary.utils



    cloudinary.config(

        cloud_name=settings.cloudinary_cloud_name,

        api_key=settings.cloudinary_api_key,

        api_secret=settings.cloudinary_api_secret,

    )



    timestamp = int(time.time())

    params = {"timestamp": timestamp, "folder": "velora/products"}

    signature = cloudinary.utils.api_sign_request(params, settings.cloudinary_api_secret)



    return CloudinarySignResponse(

        cloud_name=settings.cloudinary_cloud_name,

        api_key=settings.cloudinary_api_key,

        timestamp=timestamp,

        signature=signature,

    )





@router.post("/url", response_model=UploadResponse)

async def accept_image_url(body: UploadUrlRequest) -> UploadResponse:

    return UploadResponse(url=body.url)


