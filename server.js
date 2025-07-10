const express = require("express");
const puppeteer = require("puppeteer"); // puppeteer completo

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", async (req, res) => {
  const cpf = req.query.cpf;
  if (!cpf) {
    return res.status(400).json({ success: false, message: "CPF/CNPJ não informado." });
  }

  let browser;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox"
      ]
    });

    const page = await browser.newPage();
    await page.goto("https://projudi.tjgo.jus.br/BuscaProcesso", {
      waitUntil: "networkidle2"
    });

    await page.type("#CpfCnpjParte", cpf);
    await page.click("input[name='imgSubmeter']");

    await page.waitForNavigation({ waitUntil: "networkidle2" });

    const resultado = await page.content();

    if (resultado.includes("Nenhum processo encontrado")) {
      res.json({ success: false, message: "Nenhum processo encontrado." });
    } else {
      res.json({ success: true, html: resultado });
    }

  } catch (error) {
    console.error("Erro ao processar a requisição:", error);
    res.status(500).json({ success: false, error: `Erro interno: ${error.message}` });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
