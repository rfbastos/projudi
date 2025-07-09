const express = require("express");
const puppeteer = require("puppeteer-core"); // <-- MUDANÇA AQUI: Use puppeteer-core

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", async (req, res) => {
  const cpf = req.query.cpf;
  if (!cpf) {
    return res.status(400).json({ success: false, message: "CPF/CNPJ não informado." });
  }

  let browser; // Declare a variável browser fora do try para garantir que ela seja acessível no finally
  try {
    // **MUDANÇA CRÍTICA AQUI:**
    // Define o caminho para o executável do Chromium.
    // O Render geralmente o disponibiliza em '/usr/bin/google-chrome'.
    // Usamos uma variável de ambiente (CHROMIUM_PATH) como primeira opção para flexibilidade.
    const executablePath = process.env.CHROMIUM_PATH || '/usr/bin/google-chrome';

    browser = await puppeteer.launch({
      headless: "new", // Continua usando o modo headless 'new'
      executablePath: executablePath, // <-- MUDANÇA AQUI: Aponta para o Chromium no Render
      args: [
        "--no-sandbox", // Essencial para ambientes de servidor (segurança)
        "--disable-setuid-sandbox", // Essencial para ambientes de servidor (segurança)
        "--single-process", // Pode ajudar a economizar memória em alguns casos
        "--disable-gpu", // Desabilita o uso da GPU, útil em ambientes sem GPU
        "--disable-dev-shm-usage", // Ajuda a evitar problemas de memória em contêineres Docker
        "--no-zygote" // Pode ser útil para inicialização mais rápida
      ]
    });

    const page = await browser.newPage();
    await page.goto("https://projudi.tjgo.jus.br/BuscaProcesso", { waitUntil: "networkidle2" }); // Adicionado waitUntil para garantir carregamento completo

    await page.type("#CpfCnpjParte", cpf);
    await page.click("input[name='imgSubmeter']");

    // É crucial esperar por uma navegação ou por um seletor específico após o clique.
    // networkidle2 espera que não haja mais de 2 requisições de rede por 500ms.
    // Ou você pode esperar por um elemento que aparece após a busca:
    // await page.waitForSelector('.resultado-da-busca', { timeout: 10000 });
    await page.waitForNavigation({ waitUntil: "networkidle2" });

    const resultado = await page.content();
    // Não feche o browser aqui se você for fazer mais operações com a página.
    // O finally garantirá que ele seja fechado.

    // Aqui você pode ajustar melhor o scraping:
    if (resultado.includes("Nenhum processo encontrado")) {
      res.json({ success: false, message: "Nenhum processo encontrado." });
    } else {
      // Se você pretende extrair dados específicos, use page.evaluate()
      // Exemplo:
      // const dadosExtraidos = await page.evaluate(() => {
      //   const processos = [];
      //   document.querySelectorAll('.classe-do-processo').forEach(el => {
      //     processos.push(el.textContent);
      //   });
      //   return processos;
      // });
      // res.json({ success: true, data: dadosExtraidos });

      res.json({ success: true, html: resultado });
    }

  } catch (error) {
    console.error('Erro ao processar a requisição:', error);
    // Retorna o erro de forma mais detalhada para depuração
    res.status(500).json({ success: false, error: `Erro interno: ${error.message}` });
  } finally {
    // Garante que o navegador seja fechado, mesmo que ocorra um erro
    if (browser) {
      await browser.close();
    }
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
