# Base image dengan Node.js
FROM node:18

# Set direktori kerja
WORKDIR /app

# Salin file yang dibutuhkan
COPY package*.json ./
COPY . .

# Install dependencies
RUN npm install

# Port default Hugging Face (wajib)
EXPOSE 7860

# Jalankan bot (gunakan bot HTTP dummy untuk HF agar container tetap aktif)
CMD node index.js && tail -f /dev/null