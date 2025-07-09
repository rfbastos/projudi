const express = require("express");
const puppeteer = require("puppeteer");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", async (req, res) => {
  const cpf = req.query.cpf;
  if (!cpf) return res.status(400).json({ success: false, message: "CPF/CNPJ não informado." });

  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.goto("https://projudi.tjgo.jus.br/BuscaProcesso");

    await page.type("#CpfCnpjParte", cpf);
    await page.click("input[name='imgSubmeter']");
    await page.waitForNavigation({ waitUntil: "networkidle2" });

    const resultado = await page.content();
    await browser.close();

    // Aqui você pode ajustar melhor o scraping:
    if (resultado.includes("Nenhum processo encontrado")) {
      res.json({ success: false, message: "Nenhum processo encontrado." });
    } else {
      res.json({ success: true, html: resultado });
    }

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
