# Assets e fontes

As imagens `reference-cadastro.png` e `reference-skyline.png` são referências históricas de design. Foram movidas de `assets/` para esta pasta e não fazem parte do runtime. Não importar referências de tela como componentes do produto.

## Fotos dos lugares

Em 22/10/2026 as três cópias abaixo foram redimensionadas, sem corte, para no máximo 800 px no maior lado e salvas como JPEG progressivo, qualidade 80. São derivadas das fontes licenciadas abaixo, distribuídas sob as respectivas licenças. O card mantém os créditos e links e indica a otimização.

| Cópia em runtime | Autoria original | Data original | Licença |
| --- | --- | --- | --- |
| `assets/places/nereu.jpg` | Latinov | 2010 | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) |
| `assets/places/congresso.jpg` | Secretaria de Turismo de Criciúma / Ruy Luiz Machado | 2013 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| `assets/places/nacoes.jpg` | Secretaria de Turismo de Criciúma | 2023 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |

Fontes originais:

- [Praça Nereu Ramos](https://commons.wikimedia.org/wiki/File:Pra%C3%A7a_Nereu_Ramos1.JPG)
- [Praça do Congresso](https://commons.wikimedia.org/wiki/File:Pra%C3%A7a_do_Congresso.jpg)
- [Parque das Nações](https://commons.wikimedia.org/wiki/File:Parque_das_Na%C3%A7%C3%B5es_Crici%C3%BAma.jpg)

O arquivo `constants/placePhotos.ts` usa correspondência exata com a URL de cada original para selecionar a cópia otimizada sem trocar a atribuição de uma foto desconhecida. Para outras URLs, continua a leitura remota com placeholder em caso de erro. Fotos históricas não são descritas como a aparência atual do lugar.

`assets/city-modern.jpg` é a ilustração de identidade já presente no projeto. Nesta etapa recebeu apenas redimensionamento e compressão; não foi redesenhada.
