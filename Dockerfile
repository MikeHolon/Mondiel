# תמונת Docker אוניברסלית — עובדת ב-Railway / Fly.io / Render (Docker) / כל ספק.
FROM node:22-alpine

WORKDIR /app

# התקנת תלויות (שכבה נפרדת ל-cache יעיל)
COPY package*.json ./
RUN npm install --omit=dev

# קוד האפליקציה
COPY . .

ENV NODE_ENV=production
ENV PORT=3000
# תיקיית הנתונים — ב-Railway מגדירים Railway Volume על נתיב זה (לא משתמשים
# בפקודת VOLUME של Docker, ש-Railway אינו תומך בה). בספקים אחרים אפשר למפות
# כל Volume/Disk לנתיב הזה. ראו README.
ENV DATA_DIR=/app/data

EXPOSE 3000
CMD ["npm", "start"]
