FROM node:20-alpine
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy application code and Circom WebAssembly artifacts
COPY . .

# Build Next.js 14 production bundle
RUN npm run build

# Expose Next.js port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["npm", "run", "start"]

