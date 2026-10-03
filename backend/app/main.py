from fastapi import FastAPI

from app.api.routes import home, produtos

app = FastAPI(title="NexoPDV")

app.include_router(home.router)
app.include_router(produtos.router)
