import os
import uuid
from fastapi import FastAPI, File, Form, UploadFile, Query, HTTPException, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from aift import setting
from aift.nlp.longan import tokenizer
from aift.multimodal import textqa, vqa
from aift.nlp.translation import en2th, th2en
from aift.nlp import sentiment
from aift.speech import tts
from dotenv import load_dotenv
from pymongo import MongoClient
from bson import ObjectId
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from aift.image import thaifood
from aift.image.detection import lpr
load_dotenv()


# MongoDB connection
client = MongoClient(os.getenv("MONGODB_URI"))
db = client["ai"]
users_collection = db["users"]
chat_collection = db["chats"]
conversation_collection = db["conversation"]

# JWT setup
SECRET_KEY = os.getenv("SECRET_KEY", "mysecretkey")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Pydantic models
class User(BaseModel):
    username: str
    password: str

class UserInDB(User):
    password: str



# Utility functions for hashing password and creating JWT
def get_password_hash(password: str):
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: timedelta = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)):
    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def updateConverName(converId: str, name: str):
    return conversation_collection.update_one( {"_id": ObjectId(converId)}, {"$set": {"name": name}})

setting.set_api_key(os.getenv("AIFORTHAI_API_KEY"))

app = FastAPI()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# อนุญาตให้ React เรียก API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

class TextRequest(BaseModel):
    text: str
    conver: str
    input: str


# Register user
@app.post("/register")
async def register(user: User):
    user_in_db = users_collection.find_one({"username": user.username})
    if user_in_db:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    password = get_password_hash(user.password)
    new_user = {
        "username": user.username,
        "password": password
    }
    
    users_collection.insert_one(new_user)
    return {"status": True}


@app.post("/login")
async def login(user: User):
    user_in_db = users_collection.find_one({"username": user.username})
    if not user_in_db or not verify_password(user.password, user_in_db["password"]):
        return {"status": False }
    
    access_token = create_access_token(data={"sub": user.username, "id": str(user_in_db["_id"])})
    return {"status": True,"access_token": access_token, "token_type": "bearer"}

# Dependency to get the current user from the token
def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = verify_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload


@app.delete("/chats/{chat_id}")
async def delete_chat(
    chat_id: str,
    current_user: str = Depends(get_current_user)
):
    if not ObjectId.is_valid(chat_id):
        raise HTTPException(status_code=400, detail="Invalid chat ID")

    conversation_result = conversation_collection.delete_one({
        "_id": ObjectId(chat_id),
        "user": ObjectId(current_user['id'])
    })
    chat_result = chat_collection.delete_many({
        "conver": ObjectId(chat_id)
    })

    if conversation_result.deleted_count == 0 and chat_result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Chat not found or not authorized to delete")

    return {
        "status": True,
    }

@app.get("/chats")
async def chats_route(
    current_user: str = Depends(get_current_user)
):
    conver_data = list(conversation_collection.find({"user": ObjectId(current_user['id'])}))
    conver_data = [{key: str(value) if isinstance(value, ObjectId) else value for key, value in doc.items()} for doc in conver_data]
    return {"status": True, "convers": conver_data}

@app.get("/conversation")
async def conversation_route(
    current_user: str = Depends(get_current_user),
    conver_id: str = Query(None, alias="converId", description="Conversation ID")
):
    if conver_id:
        conver_data = list(chat_collection.find({"conver": ObjectId(conver_id)}))
        conver_data = [{key: str(value) if isinstance(value, ObjectId) else value for key, value in doc.items()} for doc in conver_data]
        response = {"status": True, "conver": conver_data}
    else:
        # Ensure current_uหser['id'] is an ObjectId
        create = conversation_collection.insert_one({
            "user": ObjectId(current_user['id']),
            "name": "แชทใหม่"
        })
        response = {"status": True, "id": str(create.inserted_id)}

    return response


@app.get("/profile")
async def protected_route(current_user: str = Depends(get_current_user)):
    return {"status": True, "username": current_user['sub']}

@app.post("/tokenize")
async def tokenize_text(request: TextRequest, current_user: str = Depends(get_current_user)):
    try:
        conver_id = ObjectId(request.conver) if request.conver else None
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid conver ID")
    tokens = tokenizer.tokenize(request.text)
    chat_collection.insert_one({
        "user": ObjectId(current_user['id']),
        "input": request.text,
        "conver": conver_id,
        "type": "tokenize",
        "answer": tokens['result']
    })
    updateConverName(conver_id, request.text)
    return {"tokens": tokens}


@app.post("/emonews")
async def emonews_text(request: TextRequest, current_user: str = Depends(get_current_user)):
    try:
        conver_id = ObjectId(request.conver) if request.conver else None
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid conver ID")
    
    response = sentiment.analyze(request.text, engine='emonews')
    result = response['result']
    text_response = f"""**ผลการวิเคราะห์อารมณ์จากข้อความ**
ข้อความ: {response['text']}
ผลลัพธ์:
ไม่ชัดเจน: {result['neutral']}
ความพึงพอใจ: {result['pleasant']}
ความสุข: {result['joy']}
ความตกใจ: {result['surprise']}
ความโกรธ: {result['anger']}
ความกลัว: {result['fear']}
ความเศร้า: {result['sadness']}
"""

    
    chat_collection.insert_one({
        "user": ObjectId(current_user['id']),
        "input": request.text,
        "conver": conver_id,
        "type": "emonews",
        "answer": text_response
    })

    updateConverName(conver_id, request.text)
    return {"answer": text_response}

@app.post("/ssense")
async def ssense_text(request: TextRequest, current_user: str = Depends(get_current_user)):
    try:
        conver_id = ObjectId(request.conver) if request.conver else None
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid conver ID")
        
    response = sentiment.analyze(request.text, engine='ssense')
    sentiment_data = response.get("sentiment", {})
    intention_data = response.get("intention", {})
    preprocess_data = response.get("preprocess", {})

    text_response = f"""**การวิเคราะห์อารมณ์**
คะแนนอารมณ์: {sentiment_data.get("score", "N/A")}
อารมณ์: {sentiment_data.get("polarity", "N/A")}

การวิเคราะห์เจตนา:
- การขอข้อมูล: {intention_data.get("request", "N/A")}
- การแสดงความคิดเห็น: {intention_data.get("sentiment", "N/A")}
- คำถาม: {intention_data.get("question", "N/A")}
- การประกาศ: {intention_data.get("announcement", "N/A")}

การประมวลผลข้อมูล:
ข้อความ: {preprocess_data.get("input", "N/A")}
คำที่มีความหมายบวก: {', '.join(preprocess_data.get("pos", []))}
คำที่มีความหมายลบ: {', '.join(preprocess_data.get("neg", []))}
คำที่สำคัญ: {', '.join(preprocess_data.get("keyword", []))}
"""
    chat_collection.insert_one({
        "user": ObjectId(current_user['id']),
        "input": request.text,
        "conver": conver_id,
        "type": "ssense",
        "answer": text_response
    })

    updateConverName(conver_id, request.text)
    return {"answer": text_response}

@app.post("/textqa")
async def qa_text(request: TextRequest, current_user: str = Depends(get_current_user)):
    try:
        conver_id = ObjectId(request.conver) if request.conver else None
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid conver ID")
    response = textqa.generate(request.text)
    
    chat_collection.insert_one({
        "user": ObjectId(current_user['id']),
        "input": request.input,
        "conver": conver_id,
        "type": "textqa",
        "answer": response["content"]
    })
    updateConverName(conver_id, request.input)
    return {"answer": response["content"]}
    # return {"answer": "test"}

@app.post("/en2th")
async def en2th_text(request: TextRequest, current_user: str = Depends(get_current_user)):
    try:
        conver_id = ObjectId(request.conver) if request.conver else None
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid conver ID")

    response = en2th.translate(request.text)

    chat_collection.insert_one({
        "user": ObjectId(current_user['id']),
        "input": request.text,
        "conver": conver_id,
        "type": "en2th",
        "answer": response['translated_text']
    })

    updateConverName(conver_id, request.text)
    return {"translate": response}

@app.post("/th2en")
async def en2th_text(request: TextRequest, current_user: str = Depends(get_current_user)):
    try:
        conver_id = ObjectId(request.conver) if request.conver else None
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid conver ID")
        
    response = th2en.translate(request.text)

    chat_collection.insert_one({
        "user": ObjectId(current_user['id']),
        "input": request.text,
        "conver": conver_id,
        "type": "th2en",
        "answer": response['translated_text']
    })

    updateConverName(conver_id, request.text)
    return {"translate": response}

@app.post("/tts")
async def tts_text(request: TextRequest, current_user: str = Depends(get_current_user)):
   try:
    response = tts.convert(request.text, f"uploads/tts/{uuid.uuid4()}.wav")
    try:
        conver_id = ObjectId(request.conver) if request.conver else None
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid conver ID")

    chat_collection.insert_one({
        "user": ObjectId(current_user['id']),
        "input": request.text,
        "conver": conver_id,
        "type": "tts",
        "answer": response
    })
    updateConverName(conver_id, request.text)
    return {"answer": response}
   except Exception as e:
        return {"answer": "เกิดข้อผิดพลาด"}

@app.post("/tfood")
async def upload_tfood(file: UploadFile = File(...), text: str = Form(...), conver: str = Form(None),
    current_user: str = Depends(get_current_user)):
    try:
        conver_id = ObjectId(conver) if conver else None
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid conver ID")

    os.makedirs("uploads", exist_ok=True)

    file_extension = file.filename.split(".")[-1]
    random_filename = f"{uuid.uuid4()}.{file_extension}"
    file_location = f"uploads/{random_filename}"
    with open(file_location, "wb") as buffer:
        buffer.write(await file.read())
    response = thaifood.analyze(file_location)
    
    chat_collection.insert_one({
        "user": ObjectId(current_user['id']),
        "input": file_location,
        "conver": conver_id,
        "type": "tfood",
        "answer": response['objects']
    })

    updateConverName(conver_id, "อัปโหลดรูปภาพ")
    return {
        # "filename": file.filename,
        "img": file_location,
        "answer": response['objects']
    }


@app.post("/lpr")
async def upload_tfood(file: UploadFile = File(...), text: str = Form(...), conver: str = Form(None),
    current_user: str = Depends(get_current_user)):
    try:
        conver_id = ObjectId(conver) if conver else None
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid conver ID")

    os.makedirs("uploads", exist_ok=True)

    file_extension = file.filename.split(".")[-1]
    random_filename = f"{uuid.uuid4()}.{file_extension}"
    file_location = f"uploads/{random_filename}"
    with open(file_location, "wb") as buffer:
        buffer.write(await file.read())
    response = lpr.analyze(file_location, crop=0, rotate=1)
    
    plate = f"ทะเบียนที่อ่านได้ **{response[0]['lpr']}**"
    chat_collection.insert_one({
        "user": ObjectId(current_user['id']),
        "input": file_location,
        "conver": conver_id,
        "type": "lpr",
        "answer": plate
    })
    updateConverName(conver_id, "อัปโหลดรูปภาพ")
    return {
        # "filename": file.filename,
        "img": file_location,
        "answer": plate
    }

@app.post("/vqa/")
async def upload_image(file: UploadFile = File(...), text: str = Form(...), conver: str = Form(None),
    current_user: str = Depends(get_current_user)
):
    try:
        conver_id = ObjectId(conver) if conver else None
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid conver ID")

    os.makedirs("uploads", exist_ok=True)

    file_extension = file.filename.split(".")[-1]
    random_filename = f"{uuid.uuid4()}.{file_extension}"
    file_location = f"uploads/{random_filename}"
    with open(file_location, "wb") as buffer:
        buffer.write(await file.read())
    response = vqa.generate(file_location, "บรรยายรูปนี้")

    updateConverName(conver_id, "บรรยายรูป")
    chat_collection.insert_one({
        "user": ObjectId(current_user['id']),
        "input": file_location,
        "conver": conver_id,
        "type": "vqa",
        "answer": response["content"]
    })

    return {
        # "filename": file.filename,
        "img": file_location,
        "answer": response["content"]
    }