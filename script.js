// CONFIGURAÇÃO DO SUPABASE
// Acesse o painel do Supabase -> Settings -> API para pegar esses dados
const SUPABASE_URL = 'https://ecwysqwvprjqrioiyooe.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_q6ADp26QiLGrPMKy2DARtg_m1sFNWpQ';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Elementos DOM
const formProduto = document.getElementById('form-produto');
const formVenda = document.getElementById('form-venda');
const selectVendaProduto = document.getElementById('venda-produto');

// Variáveis globais para armazenar o estado local após puxar do banco
let bancoProdutos = [];
let bancoVendas = [];

// --- OPERAÇÕES DA TABELA PRODUTOS (CRUD) ---

formProduto.addEventListener('submit', async function(e) {
    e.preventDefault();
    const id = document.getElementById('prod-id').value;
    const nome = document.getElementById('prod-nome').value;
    const preco = parseFloat(document.getElementById('prod-preco').value);

    if (id) {
        // UPDATE no Supabase
        const { error } = await supabase
            .from('produtos')
            .update({ nome, preco })
            .eq('id', id);
        
        if (error) alert("Erro ao atualizar produto: " + error.message);
    } else {
        // INSERT no Supabase (O id é gerado de forma automática pelo banco)
        const { error } = await supabase
            .from('produtos')
            .insert([{ nome, preco }]);
            
        if (error) alert("Erro ao cadastrar produto: " + error.message);
    }

    formProduto.reset();
    document.getElementById('prod-id').value = '';
    buscarDadosDoBanco(); // Recarrega os dados atualizados do banco remoto
});

async function deletarProduto(id) {
    // Tenta deletar diretamente. Se houver erro de FK (vendas vinculadas), o PostgreSQL bloqueará automático
    const { error } = await supabase
        .from('produtos')
        .delete()
        .eq('id', id);

    if (error) {
        if (error.code === '23503') { // Código do Postgres para violação de chave estrangeira
            alert("Erro de Chave Estrangeira (FK): Não é possível deletar este lanche pois ele possui vendas registradas!");
        } else {
            alert("Erro ao deletar: " + error.message);
        }
    } else {
        buscarDadosDoBanco();
    }
}

function carregarProdutoParaEdicao(id) {
    const prod = bancoProdutos.find(p => p.id == id);
    if (prod) {
        document.getElementById('prod-id').value = prod.id;
        document.getElementById('prod-nome').value = prod.nome;
        document.getElementById('prod-preco').value = prod.preco;
    }
}

// --- OPERAÇÕES DA TABELA VENDAS (CRUD) ---

formVenda.addEventListener('submit', async function(e) {
    e.preventDefault();
    const produtoId = parseInt(selectVendaProduto.value);
    const qtd = parseInt(document.getElementById('venda-qtd').value);

    // INSERT na tabela de vendas do Supabase
    const { error } = await supabase
        .from('vendas')
        .insert([{ produto_id: produtoId, quantidade: qtd }]);

    if (error) {
        alert("Erro ao registrar venda: " + error.message);
    } else {
        formVenda.reset();
        buscarDadosDoBanco();
    }
});

async function deletarVenda(id) {
    const { error } = await supabase
        .from('vendas')
        .delete()
        .eq('id', id);

    if (error) {
        alert("Erro ao deletar venda: " + error.message);
    } else {
        buscarDadosDoBanco();
    }
}

// --- CONSULTAS E RENDERIZAÇÃO DA INTERFACE (SELECT E INNER JOIN) ---

// Função principal que substitui a antiga "salvarEAtualizar"
async function buscarDadosDoBanco() {
    // 1. SELECT * FROM produtos ORDER BY id ASC
    const { data: produtos, error: errProd } = await supabase
        .from('produtos')
        .select('*')
        .order('id', { ascending: true });

    // 2. SELECT * FROM vendas ORDER BY id DESC
    const { data: vendas, error: errVendas } = await supabase
        .from('vendas')
        .select('*')
        .order('id', { ascending: false });

    if (errProd || errVendas) {
        console.error("Erro ao buscar dados do Supabase:", errProd || errVendas);
        return;
    }

    // Atualiza o estado das nossas listas na memória
    bancoProdutos = produtos || [];
    bancoVendas = vendas || [];

    renderizarProdutos();
    renderizarVendas();
    atualizarSelectProdutos();
}

function renderizarProdutos() {
    const tbody = document.querySelector('#tabela-produtos tbody');
    tbody.innerHTML = '';
    bancoProdutos.forEach(p => {
        tbody.innerHTML += `
            <tr>
                <td><strong>${p.id}</strong></td>
                <td>${p.nome}</td>
                <td>R$ ${parseFloat(p.preco).toFixed(2)}</td>
                <td>
                    <button class="btn btn-edit" onclick="carregarProdutoParaEdicao(${p.id})">Editar</button>
                    <button class="btn btn-danger" onclick="deletarProduto(${p.id})">Excluir</button>
                </td>
            </tr>
        `;
    });
}

function renderizarVendas() {
    const tbody = document.querySelector('#tabela-vendas tbody');
    tbody.innerHTML = '';
    
    bancoVendas.forEach(v => {
        // Resolvemos o INNER JOIN programaticamente associando a chave estrangeira v.produto_id com o lanche correspondente
        const produto = bancoProdutos.find(p => p.id === v.produto_id);
        const nomeProduto = produto ? produto.nome : "Produto Excluído";
        const precoProduto = produto ? parseFloat(produto.preco) : 0;
        const total = precoProduto * v.quantidade;

        tbody.innerHTML += `
            <tr>
                <td><strong>${v.id}</strong></td>
                <td>${nomeProduto} (ID: ${v.produto_id})</td>
                <td>${v.quantidade}x</td>
                <td>R$ ${total.toFixed(2)}</td>
                <td>
                    <button class="btn btn-danger" onclick="deletarVenda(${v.id})">Excluir</button>
                </td>
            </tr>
        `;
    });
}

function atualizarSelectProdutos() {
    selectVendaProduto.innerHTML = '<option value="">-- Selecione um lanche --</option>';
    bancoProdutos.forEach(p => {
        selectVendaProduto.innerHTML += `<option value="${p.id}">${p.nome} - R$ ${parseFloat(p.preco).toFixed(2)}</option>`;
    });
}

// Inicializa a página buscando as informações em tempo real no banco de dados
buscarDadosDoBanco();
