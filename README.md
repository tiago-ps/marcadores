# Entrelinhas — Marcadores de página

Site de divulgação dos marcadores de página, com visual editorial, responsivo e galeria dinâmica.

## Publicar no GitHub Pages

1. No repositório, abra **Settings**.
2. No menu lateral, entre em **Pages**.
3. Em **Build and deployment**, selecione **Deploy from a branch**.
4. Escolha a branch **main** e a pasta **/ (root)**; clique em **Save**.
5. Aguarde a publicação indicada pelo próprio GitHub. O endereço esperado será:
   `https://tiago-ps.github.io/marcadores/`

## Adicionar as fotos

Envie as fotografias originais para a pasta `imagens/`, usando nomes como `marcador-01.jpg`, `marcador-02.png` etc. Os formatos JPG, JPEG, PNG e WebP são aceitos.

O catálogo fica em `catalogo.js`. Ele já possui 12 posições preparadas. Para mais modelos, basta acrescentar uma entrada seguindo o mesmo padrão:

```js
{ titulo: "Marcador 13", imagem: "imagens/marcador-13" }
```

A galeria só exibe os modelos cujas fotografias foram encontradas. Assim, as posições ainda sem foto não aparecem para os visitantes.

## Arquivos principais

- `index.html`: conteúdo e estrutura da página.
- `style.css`: identidade visual e adaptação para celular.
- `catalogo.js`: lista dos marcadores.
- `app.js`: carregamento das fotos, menu e visualização ampliada.
- `imagens/`: fotografias originais.

O site não utiliza serviços externos para armazenar dados. A fonte do catálogo é o próprio repositório.