# Stage-1-Backend-Data-Persistence-API-Design-Assessment

## Endpoints

```
POST   /api/profiles
GET    /api/profiles
GET    /api/profiles/:id
DELETE /api/profiles/:id
```

## Example Responses

**Create Profile — Success**
```
POST /api/profiles
{ "name": "ella" }

{
  "status": "success",
  "data": {
    "id": "b3f9c1e2-7d4a-4c91-9c2a-1f0a8e5b6d12",
    "name": "ella",
    "gender": "female",
    "gender_probability": 0.99,
    "sample_size": 1234,
    "age": 46,
    "age_group": "adult",
    "country_id": "DRC",
    "country_probability": 0.85,
    "created_at": "2026-04-01T12:00:00Z"
  }
}
```

**Create Profile — Already Exists**
```
POST /api/profiles
{ "name": "ella" }

{
  "status": "success",
  "message": "Profile already exists",
  "data": { ...existing profile... }
}
```

**Get All Profiles**
```
GET /api/profiles

{
  "status": "success",
  "count": 2,
  "data": [
    {
      "id": "id-1",
      "name": "emmanuel",
      "gender": "male",
      "age": 25,
      "age_group": "adult",
      "country_id": "NG"
    },
    {
      "id": "id-2",
      "name": "sarah",
      "gender": "female",
      "age": 28,
      "age_group": "adult",
      "country_id": "US"
    }
  ]
}
```

**Get All Profiles — With Filters**
```
GET /api/profiles?gender=male&country_id=NG

{
  "status": "success",
  "count": 1,
  "data": [
    {
      "id": "id-1",
      "name": "emmanuel",
      "gender": "male",
      "age": 25,
      "age_group": "adult",
      "country_id": "NG"
    }
  ]
}
```

**Get Single Profile**
```
GET /api/profiles/b3f9c1e2-7d4a-4c91-9c2a-1f0a8e5b6d12

{
  "status": "success",
  "data": {
    "id": "b3f9c1e2-7d4a-4c91-9c2a-1f0a8e5b6d12",
    "name": "emmanuel",
    "gender": "male",
    "gender_probability": 0.99,
    "sample_size": 1234,
    "age": 25,
    "age_group": "adult",
    "country_id": "NG",
    "country_probability": 0.85,
    "created_at": "2026-04-01T12:00:00Z"
  }
}
```

**Delete Profile — Success**
```
DELETE /api/profiles/b3f9c1e2-7d4a-4c91-9c2a-1f0a8e5b6d12

204 No Content
```

**Profile Not Found**
```
GET /api/profiles/invalid-id

{
  "status": "error",
  "message": "Profile not found"
}
```

**Missing Name**
```
POST /api/profiles
{}

{
  "status": "error",
  "message": "Missing or empty name"
}
```

**Upstream API Failure**
```
{
  "status": "error",
  "message": "Genderize returned an invalid response"
}
```
