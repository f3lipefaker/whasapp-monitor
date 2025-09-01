#!/bin/bash

# Nome do arquivo a ser modificado
arquivo="./node_modules/whatsapp-web.js/src/Client.js"

# A linha que você deseja modificar
linha_antiga='return await window.Store.ProfilePic.profilePicFind(chatWid);'

# A nova linha que você deseja inserir
linha_nova='return await window.Store.ProfilePic.requestProfilePicFromServer(chatWid);'

# Verifica se o arquivo existe
if [ -e "$arquivo" ]; then
  # Substitui a linha antiga pela nova linha no arquivo
  sed -i "s/$linha_antiga/$linha_nova/" "$arquivo"
  echo "Linha modificada com sucesso."
else
  echo "O arquivo $arquivo não foi encontrado."
fi
