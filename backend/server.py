from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, date

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ==================== MODELS ====================

class MealCreate(BaseModel):
    name: str
    calories: float
    protein: float

class Meal(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    calories: float
    protein: float
    date: str = Field(default_factory=lambda: datetime.now().strftime("%Y-%m-%d"))
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ExerciseCreate(BaseModel):
    name: str
    details: str
    video_url: Optional[str] = None
    is_custom: bool = True

class Exercise(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    details: str
    video_url: Optional[str] = None
    is_custom: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class WorkoutLogCreate(BaseModel):
    exercise_name: str
    exercise_details: str

class WorkoutLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    exercise_name: str
    exercise_details: str
    date: str = Field(default_factory=lambda: datetime.now().strftime("%Y-%m-%d"))
    completed_at: datetime = Field(default_factory=datetime.utcnow)

class WeightCreate(BaseModel):
    weight: float
    notes: Optional[str] = None

class Weight(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    weight: float
    notes: Optional[str] = None
    date: str = Field(default_factory=lambda: datetime.now().strftime("%Y-%m-%d"))
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ProgressPhotoCreate(BaseModel):
    image_base64: str
    notes: Optional[str] = None

class ProgressPhoto(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    image_base64: str
    notes: Optional[str] = None
    date: str = Field(default_factory=lambda: datetime.now().strftime("%Y-%m-%d"))
    created_at: datetime = Field(default_factory=datetime.utcnow)

class DailyStats(BaseModel):
    total_calories: float
    total_protein: float
    meals_count: int
    workouts_count: int
    date: str

# ==================== ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "Fitness App API"}

@api_router.post("/meals", response_model=Meal)
async def create_meal(meal_input: MealCreate):
    meal = Meal(**meal_input.dict())
    await db.meals.insert_one(meal.dict())
    return meal

@api_router.get("/meals", response_model=List[Meal])
async def get_meals(date_filter: Optional[str] = None):
    query = {}
    if date_filter:
        query["date"] = date_filter
    meals = await db.meals.find(query).sort("created_at", -1).to_list(1000)
    return [Meal(**meal) for meal in meals]

@api_router.get("/meals/today", response_model=List[Meal])
async def get_today_meals():
    today = datetime.now().strftime("%Y-%m-%d")
    meals = await db.meals.find({"date": today}).sort("created_at", -1).to_list(1000)
    return [Meal(**meal) for meal in meals]

@api_router.delete("/meals/{meal_id}")
async def delete_meal(meal_id: str):
    result = await db.meals.delete_one({"id": meal_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Meal not found")
    return {"message": "Meal deleted successfully"}

@api_router.post("/exercises", response_model=Exercise)
async def create_exercise(exercise_input: ExerciseCreate):
    exercise = Exercise(**exercise_input.dict())
    await db.exercises.insert_one(exercise.dict())
    return exercise

@api_router.get("/exercises", response_model=List[Exercise])
async def get_exercises():
    exercises = await db.exercises.find().sort("created_at", -1).to_list(1000)
    return [Exercise(**ex) for ex in exercises]

@api_router.delete("/exercises/{exercise_id}")
async def delete_exercise(exercise_id: str):
    result = await db.exercises.delete_one({"id": exercise_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Exercise not found")
    return {"message": "Exercise deleted successfully"}

@api_router.post("/workouts", response_model=WorkoutLog)
async def log_workout(workout_input: WorkoutLogCreate):
    workout = WorkoutLog(**workout_input.dict())
    await db.workouts.insert_one(workout.dict())
    return workout

@api_router.get("/workouts", response_model=List[WorkoutLog])
async def get_workouts(date_filter: Optional[str] = None):
    query = {}
    if date_filter:
        query["date"] = date_filter
    workouts = await db.workouts.find(query).sort("completed_at", -1).to_list(1000)
    return [WorkoutLog(**w) for w in workouts]

@api_router.get("/workouts/today", response_model=List[WorkoutLog])
async def get_today_workouts():
    today = datetime.now().strftime("%Y-%m-%d")
    workouts = await db.workouts.find({"date": today}).sort("completed_at", -1).to_list(1000)
    return [WorkoutLog(**w) for w in workouts]

@api_router.post("/weights", response_model=Weight)
async def add_weight(weight_input: WeightCreate):
    weight = Weight(**weight_input.dict())
    await db.weights.insert_one(weight.dict())
    return weight

@api_router.get("/weights", response_model=List[Weight])
async def get_weights(limit: int = 30):
    weights = await db.weights.find().sort("created_at", -1).to_list(limit)
    return [Weight(**w) for w in weights]

@api_router.delete("/weights/{weight_id}")
async def delete_weight(weight_id: str):
    result = await db.weights.delete_one({"id": weight_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Weight entry not found")
    return {"message": "Weight entry deleted successfully"}

@api_router.post("/photos", response_model=ProgressPhoto)
async def add_progress_photo(photo_input: ProgressPhotoCreate):
    photo = ProgressPhoto(**photo_input.dict())
    await db.photos.insert_one(photo.dict())
    return photo

@api_router.get("/photos", response_model=List[ProgressPhoto])
async def get_progress_photos(limit: int = 50):
    photos = await db.photos.find().sort("created_at", -1).to_list(limit)
    return [ProgressPhoto(**p) for p in photos]

@api_router.delete("/photos/{photo_id}")
async def delete_progress_photo(photo_id: str):
    result = await db.photos.delete_one({"id": photo_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Photo not found")
    return {"message": "Photo deleted successfully"}

@api_router.get("/stats/daily", response_model=DailyStats)
async def get_daily_stats(date_param: Optional[str] = None):
    target_date = date_param or datetime.now().strftime("%Y-%m-%d")
    meals = await db.meals.find({"date": target_date}).to_list(1000)
    total_calories = sum(m.get("calories", 0) for m in meals)
    total_protein = sum(m.get("protein", 0) for m in meals)
    workouts = await db.workouts.find({"date": target_date}).to_list(1000)
    return DailyStats(
        total_calories=total_calories,
        total_protein=total_protein,
        meals_count=len(meals),
        workouts_count=len(workouts),
        date=target_date
    )

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
