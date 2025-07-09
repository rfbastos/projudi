const puppeteer = require('puppeteer');

async function consultaPorCpf(cpf) {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    try {
        await page.goto('https://projudi.tjgo.jus.br/BuscaProcesso', { waitUntil: 'networkidle0' });

        // Aguarda o campo CPF/CNPJ da Parte ficar disponível
        await page.waitForSelector('#CpfCnpjParte');

        // Preenche o campo com o CPF informado
        await page.type('#CpfCnpjParte', cpf);

        // Marcar a página como "2" (simulando a ação do botão Buscar)
        await page.evaluate(() => {
            document.getElementById('PaginaAtual').value = '2';
        });

        // Clica no botão "Buscar"
        await Promise.all([
            page.click('input[name="imgSubmeter"]'),
            page.waitForNavigation({ waitUntil: 'networkidle0' })
        ]);

        // Aguarda um pouco (substituindo waitForTimeout)
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Pega o conteúdo da página de retorno
        const html = await page.content();

        // Tenta extrair a tabela de processos, se houver
        const processos = await page.evaluate(() => {
            const dados = [];
            const linhas = document.querySelectorAll('.divCorpo .Tabela tbody tr');
            linhas.forEach(linha => {
                const colunas = linha.querySelectorAll('td');
                if (colunas.length > 2) {
                    dados.push({
                        numero: colunas[0].innerText.trim(),
                        classe: colunas[1].innerText.trim(),
                        assunto: colunas[2].innerText.trim()
                    });
                }
            });
            return dados;
        });

        if (processos.length === 0) {
            console.log(JSON.stringify({ success: false, message: 'Nenhum processo encontrado.' }, null, 2));
        } else {
            console.log(JSON.stringify({ success: true, processos }, null, 2));
        }

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await browser.close();
    }
}

// Lê o CPF/CNPJ da linha de comando
const cpf = process.argv[2];
if (!cpf) {
    console.error('⚠️  Informe o CPF/CNPJ como argumento.\nEx: node consultaCpf.js 12345678900');
    process.exit(1);
}

consultaPorCpf(cpf);
