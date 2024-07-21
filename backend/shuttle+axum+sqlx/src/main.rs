use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{delete, get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, FromRow, PgPool};
use tower::ServiceBuilder;
use tower_http::cors::{AllowHeaders, AllowMethods, AllowOrigin, CorsLayer};

async fn get_tasks(State(state): State<MyState>) -> Result<impl IntoResponse, impl IntoResponse> {
    match sqlx::query_as::<_, Task>("SELECT * FROM tasks order by created_at desc")
        .fetch_all(&state.pool)
        .await
    {
        Ok(tasks) => Ok((StatusCode::OK, Json(tasks))),
        Err(e) => Err((StatusCode::BAD_REQUEST, e.to_string())),
    }
}

async fn get_task(
    Path(id): Path<Uuid>,
    State(state): State<MyState>,
) -> Result<impl IntoResponse, impl IntoResponse> {
    match sqlx::query_as::<_, Task>("SELECT * FROM tasks WHERE id = $1")
        .bind(id)
        .fetch_one(&state.pool)
        .await
    {
        Ok(tasks) => Ok((StatusCode::OK, Json(tasks))),
        Err(e) => Err((StatusCode::BAD_REQUEST, e.to_string())),
    }
}

async fn add_task(
    State(state): State<MyState>,
    Json(data): Json<NewTask>,
) -> Result<impl IntoResponse, impl IntoResponse> {
    match sqlx::query_as::<_, Task>(
        "INSERT INTO tasks (id, text, completed) VALUES ($1, $2, false) RETURNING id, text, completed",
    )
    .bind(Uuid::new_v4())
    .bind(&data.text)
    .fetch_one(&state.pool)
    .await
    {
        Ok(task) => Ok((StatusCode::CREATED, Json(task))),
        Err(e) => Err((StatusCode::BAD_REQUEST, e.to_string())),
    }
}

async fn edit_task(
    Path(id): Path<Uuid>,
    State(state): State<MyState>,
    Json(data): Json<EditTask>,
) -> Result<impl IntoResponse, impl IntoResponse> {
    let query = match &data {
        EditTask {
            text: Some(_),
            completed: Some(_),
        } => {
            sqlx::query_as::<_, Task>("UPDATE tasks SET text = $1, completed = $2 WHERE id = $3 RETURNING id, text, completed").bind(&data.text).bind(&data.completed).bind(id)
        }
        EditTask {
            text: Some(_),
            completed: None,
        } => sqlx::query_as::<_, Task>("UPDATE tasks SET text = $1 WHERE id = $2 RETURNING id, text, completed").bind(&data.text).bind(id),
        EditTask {
            text: None,
            completed: Some(_),
        } => sqlx::query_as::<_, Task>("UPDATE tasks SET completed = $1 WHERE id = $2 RETURNING id, text, completed").bind(&data.completed).bind(id),
        EditTask {
            text: None,
            completed: None,
        } => return Err((StatusCode::BAD_REQUEST, "No data provided".to_string())),
    };
    match query.fetch_one(&state.pool).await {
        Ok(task) => Ok((StatusCode::OK, Json(task))),
        Err(e) => Err((StatusCode::BAD_REQUEST, e.to_string())),
    }
}

async fn delete_task(Path(id): Path<Uuid>, State(state): State<MyState>) {
    match sqlx::query("DELETE FROM tasks WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await
    {
        Ok(_) => (),
        Err(e) => eprintln!("Failed to delete task: {}", e),
    }
}

#[derive(Clone)]
struct MyState {
    pool: PgPool,
}

#[shuttle_runtime::main]
async fn main(#[shuttle_shared_db::Postgres] pool: PgPool) -> shuttle_axum::ShuttleAxum {
    sqlx::migrate!()
        .run(&pool)
        .await
        .expect("Failed to run migrations");

    let state = MyState { pool };
    let cors = CorsLayer::new()
        .allow_headers(AllowHeaders::any())
        .allow_methods(AllowMethods::any())
        .allow_origin(AllowOrigin::any());
    let router = Router::new()
        .route("/tasks", post(add_task))
        .route("/tasks", get(get_tasks))
        .route("/tasks/:id", get(get_task))
        .route("/tasks/:id", post(edit_task))
        .route("/tasks/:id", delete(delete_task))
        .layer(ServiceBuilder::new().layer(cors))
        .with_state(state);

    Ok(router.into())
}

#[derive(Deserialize)]
struct NewTask {
    pub text: String,
}

#[derive(Deserialize)]
struct EditTask {
    pub text: Option<String>,
    pub completed: Option<bool>,
}

#[derive(Serialize, FromRow)]
struct Task {
    pub id: Uuid,
    pub text: String,
    pub completed: bool,
}
