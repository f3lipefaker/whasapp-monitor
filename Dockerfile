# Use a imagem Node.js como imagem base
FROM node:latest

# Crie um diretório de trabalho dentro do contêiner
WORKDIR /app

# Copie os arquivos de código-fonte da sua aplicação para o diretório de trabalho no contêiner
COPY . .

# Instale as dependências da aplicação
RUN npm install

# Instala o Google Chrome (se necessário)
RUN apt-get update -y \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list' \
    && apt-get update -y \
    && apt-get install -y google-chrome-stable \
    && apt install nano

EXPOSE 9000

# Comando para iniciar a aplicação quando o contêiner for executado
CMD ["npm", "start"]