// ============================================================
// SUPABASE
// ============================================================
const SUPABASE_URL = 'https://ecwysqwvprjqrioiyooe.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_q6ADp26QiLGrPMKy2DARtg_m1sFNWpQ';

const { createClient } = window.supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Elementos presentes na versão simplificada do HTML
const vitrine = document.getElementById('vitrine-produtos');
const selectProduto = document.getElementById('venda-produto');
const formVenda = document.getElementById('form-venda');
const inputQuantidade = document.getElementById('venda-qtd');
const mensagemVenda = document.getElementById('mensagem-venda');

let produtos = [];

function formatarPreco(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function mostrarMensagem(texto, erro = false) {
    if (!mensagemVenda) return;
    mensagemVenda.textContent = texto;
    mensagemVenda.className = erro ? 'mensagem erro' : 'mensagem sucesso';
}

// Detecta bebidas pelo nome para escolher uma foto ilustrativa.
function ehBebida(nome) {
    return /coca|guaraná|guarana|refrigerante|bebida|suco|água|agua|fanta|sprite|pepsi|chá|cha|limonada|milkshake/i.test(nome || '');
}

const fotosLanches = [
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=85',
    'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=900&q=85',
    'https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=900&q=85'
];

const fotosBebidas = [
    'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=900&q=85',
    'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=900&q=85'
];

function renderizarProdutos() {
    if (!vitrine || !selectProduto) {
        console.error('Não encontrei #vitrine-produtos ou #venda-produto no HTML.');
        return;
    }

    vitrine.replaceChildren();
    selectProduto.innerHTML = '<option value="">-- Selecione um produto --</option>';

    if (produtos.length === 0) {
        const vazio = document.createElement('div');
        vazio.className = 'loading-card';
        vazio.textContent = 'Nenhum produto encontrado na tabela produtos.';
        vitrine.appendChild(vazio);

        const opcao = document.createElement('option');
        opcao.value = '';
        opcao.textContent = 'Nenhum produto cadastrado';
        opcao.disabled = true;
        selectProduto.appendChild(opcao);
        return;
    }

    produtos.forEach((produto, indice) => {
        const bebida = ehBebida(produto.nome);
        const fotos = bebida ? fotosBebidas : fotosLanches;

        // Card visual do cardápio
        const card = document.createElement('article');
        card.className = 'product-card';

        const imagem = document.createElement('img');
        imagem.className = 'product-image';
        imagem.src = fotos[indice % fotos.length];
        imagem.alt = produto.nome || 'Produto do cardápio';
        imagem.loading = 'lazy';
        imagem.onerror = () => {
            imagem.style.display = 'none';
        };

        const info = document.createElement('div');
        info.className = 'product-info';

        const tipo = document.createElement('span');
        tipo.className = 'product-tag';
        tipo.textContent = bebida ? '🥤 Bebida' : '🍔 Lanche';

        const nome = document.createElement('h3');
        nome.textContent = produto.nome;

        const preco = document.createElement('div');
        preco.className = 'product-price';
        preco.textContent = formatarPreco(produto.preco);

        info.append(tipo, nome, preco);
        card.append(imagem, info);
        vitrine.appendChild(card);

        // O value precisa ser o ID do produto para preencher vendas.produto_id.
        const opcao = document.createElement('option');
        opcao.value = String(produto.id);
        opcao.textContent = `${produto.nome} — ${formatarPreco(produto.preco)}`;
        selectProduto.appendChild(opcao);
    });
}

async function carregarProdutos() {
    if (vitrine) {
        vitrine.innerHTML = '<div class="loading-card">Carregando cardápio...</div>';
    }

    if (selectProduto) {
        selectProduto.innerHTML = '<option value="">Carregando produtos...</option>';
    }

    const { data, error } = await supabaseClient
        .from('produtos')
        .select('id, nome, preco')
        .order('id', { ascending: true });

    if (error) {
        console.error('Erro ao carregar produtos do Supabase:', error);

        if (vitrine) {
            vitrine.innerHTML = '';
            const erro = document.createElement('div');
            erro.className = 'loading-card';
            erro.textContent = `Não foi possível carregar os produtos: ${error.message}`;
            vitrine.appendChild(erro);
        }

        if (selectProduto) {
            selectProduto.innerHTML = '<option value="">Erro ao carregar produtos</option>';
        }
        mostrarMensagem(`Erro ao carregar cardápio: ${error.message}`, true);
        return;
    }

    produtos = data || [];
    renderizarProdutos();
}

if (formVenda) {
    formVenda.addEventListener('submit', async (event) => {
        event.preventDefault();

        const produtoId = Number(selectProduto.value);
        const quantidade = Number(inputQuantidade.value);

        if (!Number.isInteger(produtoId) || produtoId <= 0) {
            mostrarMensagem('Selecione um lanche ou bebida.', true);
            return;
        }

        if (!Number.isInteger(quantidade) || quantidade < 1) {
            mostrarMensagem('Informe uma quantidade inteira maior que zero.', true);
            return;
        }

        const { error } = await supabaseClient
            .from('vendas')
            .insert([{
                produto_id: produtoId,
                quantidade: quantidade
            }]);

        if (error) {
            console.error('Erro ao registrar venda:', error);
            mostrarMensagem(`Não foi possível registrar o pedido: ${error.message}`, true);
            return;
        }

        formVenda.reset();
        if (inputQuantidade) inputQuantidade.value = 1;
        mostrarMensagem('Pedido registrado com sucesso! ❤️');
    });
}

// Executa quando o arquivo está carregado. Não depende do formulário administrativo.
carregarProdutos();
