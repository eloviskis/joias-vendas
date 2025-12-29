FROM node:22-slim
# Install openssl and fonts so Sharp can render text (DejaVu provides full glyph set)
RUN apt-get update \
	&& apt-get install -y openssl fonts-dejavu-core fontconfig \
	&& fc-cache -f -v \
	&& rm -rf /var/lib/apt/lists/*
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
