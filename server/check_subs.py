from dotenv import load_dotenv; load_dotenv()
from db import get_db
db = get_db()
subs = list(db.submissions.find({}))
print(f'Total submissions: {len(subs)}')
for s in subs:
    print(f"Sub ID: {s.get('_id')}, video_url: {s.get('video_url', 'MISSING')[:30]}..., gdrive_id: {s.get('gdrive_file_id', 'MISSING')}, status: {s.get('status')}")
