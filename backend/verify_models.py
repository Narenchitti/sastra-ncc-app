from app.schemas.models import UserBase
from pydantic import ValidationError

def test_user_model():
    # Test snake_case input
    data = {
        "id": "user-123",
        "name": "John Doe",
        "email": "john@example.com",
        "password": "hashed_password",
        "role": "CADET",
        "rank": "Cadet",
        "batch_year": 2026,
        "regimental_number": "REG123"
    }
    user = UserBase(**data)
    
    # Check if snake_case access works
    assert user.name == "John Doe"
    
    # Check if camelCase dict generation works
    dump = user.model_dump(by_alias=True)
    assert dump["name"] == "John Doe"
    assert dump["regimentalNumber"] == "REG123"
    assert dump["batchYear"] == 2026
    
    # Test camelCase input (since populate_by_name=True is set in ConfigDict)
    camel_data = {
        "id": "user-456",
        "name": "Jane Doe",
        "email": "jane@example.com",
        "password": "hashed_password",
        "role": "ANO",
        "rank": "ANO",
        "batchYear": 2027,
        "regimentalNumber": "REG456"
    }
    user2 = UserBase(**camel_data)
    assert user2.name == "Jane Doe"
    assert user2.regimental_number == "REG456"
    assert user2.batch_year == 2027
    
    print("UserBase model verification successful!")

if __name__ == "__main__":
    try:
        test_user_model()
    except Exception as e:
        print(f"Verification failed: {e}")
        import traceback
        traceback.print_exc()
