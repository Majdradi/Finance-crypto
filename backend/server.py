from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Dict, Optional, Any, Union
import uuid
import httpx
import pandas as pd
import json
from datetime import datetime, timedelta
import requests
from jose import JWTError, jwt
from passlib.context import CryptContext
from enum import Enum

# Security related constants
SECRET_KEY = "CHANGE_THIS_TO_A_RANDOM_SECRET_IN_PRODUCTION"  # In production, use a proper secret
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="Financial Research & Portfolio Monitor API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Password context for hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/token")

# Define Models
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: EmailStr
    full_name: Optional[str] = None
    disabled: bool = False
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    username: str
    email: EmailStr
    full_name: Optional[str] = None

class AssetType(str, Enum):
    STOCK = "stock"
    CRYPTO = "crypto"
    FOREX = "forex"
    ETF = "etf"
    OTHER = "other"

class Asset(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    symbol: str
    name: str
    type: AssetType
    current_price: Optional[float] = None
    last_updated: Optional[datetime] = None

class PortfolioAsset(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    asset_id: str
    quantity: float
    purchase_price: float
    purchase_date: datetime
    notes: Optional[str] = None

class Portfolio(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    description: Optional[str] = None
    assets: List[PortfolioAsset] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class PortfolioCreate(BaseModel):
    name: str
    description: Optional[str] = None

class PortfolioUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class NewsItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    source: str
    url: str
    published_at: datetime
    summary: Optional[str] = None
    sentiment: Optional[str] = None
    related_symbols: List[str] = []

class Alert(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    asset_id: str
    condition: str  # e.g., "price > 100", "price < 50"
    message: str
    is_active: bool = True
    triggered: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class AlertCreate(BaseModel):
    asset_id: str
    condition: str
    message: str

class MarketData(BaseModel):
    symbol: str
    price: float
    change: float
    change_percent: float
    volume: Optional[int] = None
    market_cap: Optional[float] = None
    data_timestamp: datetime = Field(default_factory=datetime.utcnow)

# Security functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

async def get_user(username: str):
    user = await db.users.find_one({"username": username})
    if user:
        return User(**user)

async def authenticate_user(username: str, password: str):
    user = await get_user(username)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = await get_user(username=token_data.username)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)):
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

# Mock financial data (in production, you'd use a real API)
async def get_stock_data(symbol: str):
    # Simulating API call to a financial data provider
    # In production, you would replace this with actual API calls
    mock_data = {
        "AAPL": {"price": 175.50, "change": 2.30, "change_percent": 1.32, "volume": 65432100, "market_cap": 2850000000000},
        "MSFT": {"price": 380.20, "change": -1.50, "change_percent": -0.39, "volume": 25631400, "market_cap": 2750000000000},
        "GOOGL": {"price": 142.75, "change": 0.85, "change_percent": 0.60, "volume": 18754200, "market_cap": 1850000000000},
        "AMZN": {"price": 180.30, "change": 3.20, "change_percent": 1.80, "volume": 32541600, "market_cap": 1950000000000},
        "TSLA": {"price": 248.50, "change": -5.60, "change_percent": -2.20, "volume": 85321400, "market_cap": 750000000000},
    }
    
    if symbol.upper() in mock_data:
        data = mock_data[symbol.upper()]
        return MarketData(
            symbol=symbol.upper(),
            price=data["price"],
            change=data["change"],
            change_percent=data["change_percent"],
            volume=data["volume"],
            market_cap=data["market_cap"]
        )
    else:
        # Default randomized data for any other symbol
        import random
        price = round(random.uniform(10, 500), 2)
        change = round(random.uniform(-10, 10), 2)
        percent = round((change / price) * 100, 2)
        
        return MarketData(
            symbol=symbol.upper(),
            price=price,
            change=change,
            change_percent=percent,
            volume=random.randint(100000, 10000000),
            market_cap=price * random.randint(1000000, 1000000000)
        )

# Auth routes
@api_router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# User routes
@api_router.post("/users", response_model=UserResponse)
async def create_user(user: UserCreate):
    existing_user = await db.users.find_one({"username": user.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    existing_email = await db.users.find_one({"email": user.email})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    user_data = User(
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        hashed_password=hashed_password
    )
    
    result = await db.users.insert_one(user_data.dict())
    created_user = await db.users.find_one({"_id": result.inserted_id})
    
    return UserResponse(
        id=str(created_user["_id"]),
        username=created_user["username"],
        email=created_user["email"],
        full_name=created_user.get("full_name")
    )

@api_router.get("/users/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        full_name=current_user.full_name
    )

# Market data routes
@api_router.get("/market/stock/{symbol}")
async def get_stock_price(symbol: str):
    return await get_stock_data(symbol)

@api_router.get("/market/watchlist")
async def get_watchlist_data(symbols: str = Query(..., description="Comma-separated list of stock symbols")):
    symbol_list = symbols.split(",")
    results = []
    
    for symbol in symbol_list:
        data = await get_stock_data(symbol.strip())
        results.append(data)
    
    return results

# Portfolio routes
@api_router.post("/portfolios", response_model=Portfolio)
async def create_portfolio(
    portfolio: PortfolioCreate, 
    current_user: User = Depends(get_current_active_user)
):
    new_portfolio = Portfolio(
        user_id=current_user.id,
        name=portfolio.name,
        description=portfolio.description
    )
    
    result = await db.portfolios.insert_one(new_portfolio.dict())
    created_portfolio = await db.portfolios.find_one({"_id": result.inserted_id})
    created_portfolio["id"] = str(created_portfolio["_id"])
    del created_portfolio["_id"]
    
    return Portfolio(**created_portfolio)

@api_router.get("/portfolios", response_model=List[Portfolio])
async def get_user_portfolios(current_user: User = Depends(get_current_active_user)):
    portfolios = await db.portfolios.find({"user_id": current_user.id}).to_list(1000)
    
    return [Portfolio(**{**p, "id": str(p["_id"])}) for p in portfolios]

@api_router.get("/portfolios/{portfolio_id}", response_model=Portfolio)
async def get_portfolio(
    portfolio_id: str, 
    current_user: User = Depends(get_current_active_user)
):
    portfolio = await db.portfolios.find_one({"_id": portfolio_id, "user_id": current_user.id})
    
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    portfolio["id"] = str(portfolio["_id"])
    del portfolio["_id"]
    
    return Portfolio(**portfolio)

@api_router.put("/portfolios/{portfolio_id}", response_model=Portfolio)
async def update_portfolio(
    portfolio_id: str,
    portfolio_update: PortfolioUpdate,
    current_user: User = Depends(get_current_active_user)
):
    portfolio = await db.portfolios.find_one({"_id": portfolio_id, "user_id": current_user.id})
    
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    update_data = portfolio_update.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    await db.portfolios.update_one(
        {"_id": portfolio_id}, 
        {"$set": update_data}
    )
    
    updated_portfolio = await db.portfolios.find_one({"_id": portfolio_id})
    updated_portfolio["id"] = str(updated_portfolio["_id"])
    del updated_portfolio["_id"]
    
    return Portfolio(**updated_portfolio)

@api_router.delete("/portfolios/{portfolio_id}", status_code=204)
async def delete_portfolio(
    portfolio_id: str,
    current_user: User = Depends(get_current_active_user)
):
    portfolio = await db.portfolios.find_one({"_id": portfolio_id, "user_id": current_user.id})
    
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    await db.portfolios.delete_one({"_id": portfolio_id})
    return {"status": "success"}

# Portfolio assets routes
@api_router.post("/portfolios/{portfolio_id}/assets", response_model=PortfolioAsset)
async def add_asset_to_portfolio(
    portfolio_id: str,
    asset: PortfolioAsset,
    current_user: User = Depends(get_current_active_user)
):
    portfolio = await db.portfolios.find_one({"_id": portfolio_id, "user_id": current_user.id})
    
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    # Add the asset to the portfolio
    await db.portfolios.update_one(
        {"_id": portfolio_id},
        {
            "$push": {"assets": asset.dict()},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    return asset

@api_router.get("/portfolios/{portfolio_id}/assets", response_model=List[PortfolioAsset])
async def get_portfolio_assets(
    portfolio_id: str,
    current_user: User = Depends(get_current_active_user)
):
    portfolio = await db.portfolios.find_one({"_id": portfolio_id, "user_id": current_user.id})
    
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    return portfolio.get("assets", [])

# News routes
@api_router.get("/news", response_model=List[NewsItem])
async def get_financial_news(
    limit: int = 10,
    symbols: Optional[str] = None,
    current_user: User = Depends(get_current_active_user)
):
    # Mock news data - in production, you would use a real news API
    mock_news = [
        {
            "id": str(uuid.uuid4()),
            "title": "Apple Reports Record Quarterly Revenue",
            "source": "Financial Times",
            "url": "https://example.com/apple-revenue",
            "published_at": datetime.utcnow() - timedelta(hours=3),
            "summary": "Apple Inc. reported record quarterly revenue of $91.8 billion, driven by strong iPhone sales.",
            "sentiment": "positive",
            "related_symbols": ["AAPL"]
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Microsoft Cloud Business Continues to Grow",
            "source": "Wall Street Journal",
            "url": "https://example.com/microsoft-cloud",
            "published_at": datetime.utcnow() - timedelta(hours=5),
            "summary": "Microsoft's cloud business revenue grew by 25% year over year, exceeding analyst expectations.",
            "sentiment": "positive",
            "related_symbols": ["MSFT"]
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Tesla Misses Delivery Targets",
            "source": "Reuters",
            "url": "https://example.com/tesla-deliveries",
            "published_at": datetime.utcnow() - timedelta(hours=8),
            "summary": "Tesla delivered fewer vehicles than expected in the last quarter, citing supply chain issues.",
            "sentiment": "negative",
            "related_symbols": ["TSLA"]
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Amazon Expands Healthcare Services",
            "source": "Bloomberg",
            "url": "https://example.com/amazon-healthcare",
            "published_at": datetime.utcnow() - timedelta(hours=12),
            "summary": "Amazon is expanding its healthcare services with new telehealth features.",
            "sentiment": "positive",
            "related_symbols": ["AMZN"]
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Google Announces New AI Tools for Businesses",
            "source": "CNBC",
            "url": "https://example.com/google-ai",
            "published_at": datetime.utcnow() - timedelta(days=1),
            "summary": "Google unveiled new AI tools for businesses at its annual cloud conference.",
            "sentiment": "positive",
            "related_symbols": ["GOOGL"]
        }
    ]
    
    if symbols:
        symbol_list = symbols.split(",")
        filtered_news = []
        for news in mock_news:
            if any(symbol.strip().upper() in news["related_symbols"] for symbol in symbol_list):
                filtered_news.append(news)
        return [NewsItem(**news) for news in filtered_news[:limit]]
    
    return [NewsItem(**news) for news in mock_news[:limit]]

# Alerts routes
@api_router.post("/alerts", response_model=Alert)
async def create_alert(
    alert: AlertCreate,
    current_user: User = Depends(get_current_active_user)
):
    new_alert = Alert(
        user_id=current_user.id,
        asset_id=alert.asset_id,
        condition=alert.condition,
        message=alert.message
    )
    
    result = await db.alerts.insert_one(new_alert.dict())
    created_alert = await db.alerts.find_one({"_id": result.inserted_id})
    created_alert["id"] = str(created_alert["_id"])
    del created_alert["_id"]
    
    return Alert(**created_alert)

@api_router.get("/alerts", response_model=List[Alert])
async def get_user_alerts(
    current_user: User = Depends(get_current_active_user)
):
    alerts = await db.alerts.find({"user_id": current_user.id}).to_list(1000)
    return [Alert(**{**alert, "id": str(alert["_id"])}) for alert in alerts]

@api_router.delete("/alerts/{alert_id}", status_code=204)
async def delete_alert(
    alert_id: str,
    current_user: User = Depends(get_current_active_user)
):
    alert = await db.alerts.find_one({"_id": alert_id, "user_id": current_user.id})
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    await db.alerts.delete_one({"_id": alert_id})
    return {"status": "success"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
