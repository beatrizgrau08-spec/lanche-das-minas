// Inicialização do "Banco de Dados" no LocalStorage
let bancoProdutos = JSON.parse(localStorage.getItem('tb_produtos')) || [];
let bancoVendas = JSON.parse(localStorage.getItem('tb_vendas')) || [];

// Elementos DOM
const formProduto = document.getElementById('form-produto');
const formVenda = document.getElementById('form-venda');
const selectVendaProduto = document.getElementById('venda-produto');

// --- OPERAÇÕES DA TABELA PRODUTOS (CRUD) ---

formProduto.addEventListener('submit', function(e) {
    e.preventDefault();
    const id = document.getElementById('prod-id').value;
    const nome = document.getElementById('prod-nome').value;
    const preco = parseFloat(document.getElementById('prod-preco').value);

    if (id) {
        // UPDATE: Editar produto existente
        bancoProdutos = bancoProdutos.map(p => p.id == id ? { id: parseInt(id), nome, preco } : p);
    } else {
        // INSERT: Criar novo produto com PK auto-incremento
        const novoId = bancoProdutos.length > 0 ? Math.max(...bancoProdutos.map(p => p.id)) + 1 : 1;
        bancoProdutos.push({ id: novoId, nome, preco });
    }

    salvarEAtualizar();
    formProduto.reset();
    document.getElementById('prod-id').value = '';
});

function deletarProduto(id) {
    // Validação de Integridade Referencial: impede deletar lanche se houver venda dele
    const possuiVenda = bancoVendas.some(v => v.produtoId == id);
    if (possuiVenda) {
        alert("Erro de Chave Estrangeira (FK): Não é possível deletar este lanche pois ele possui vendas registradas!");
        return;
    }
    bancoProdutos = bancoProdutos.filter(p => p.id != id);
    salvarEAtualizar();
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

formVenda.addEventListener('submit', function(e) {
    e.preventDefault();
    const produtoId = parseInt(selectVendaProduto.value);
    const qtd = parseInt(document.getElementById('venda-qtd').value);

    // INSERT na tabela de vendas
    const novoIdVenda = bancoVendas.length > 0 ? Math.max(...bancoVendas.map(v => v.id)) + 1 : 1;
    bancoVendas.push({ id: novoIdVenda, produtoId, qtd });

    salvarEAtualizar();
    formVenda.reset();
});

function deletarVenda(id) {
    bancoVendas = bancoVendas.filter(v => v.id != id);
    salvarEAtualizar();
}

// --- RENDERIZAÇÃO DA INTERFACE (SIMULAÇÃO DE SELECT / JOIN) ---

function salvarEAtualizar() {
    // Sincroniza dados no LocalStorage
    localStorage.setItem('tb_produtos', JSON.stringify(bancoProdutos));
    localStorage.setItem('tb_vendas', JSON.stringify(bancoVendas));
    
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
                <td>R$ ${p.preco.toFixed(2)}</td>
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
        // Simulação de INNER JOIN (Busca os dados do produto correspondente à FK)
        const produto = bancoProdutos.find(p => p.id === v.produtoId);
        const nomeProduto = produto ? produto.nome : "Produto Excluído";
        const precoProduto = produto ? produto.preco : 0;
        const total = precoProduto * v.qtd;

        tbody.innerHTML += `
            <tr>
                <td><strong>${v.id}</strong></td>
                <td>${nomeProduto} (ID: ${v.produtoId})</td>
                <td>${v.qtd}x</td>
                <td>R$ ${total.toFixed(2)}</td>
                <td>
                    <button class="btn btn-danger" onclick="deletarVenda(${v.id})">Excluir</button>
                </td>
            </tr>
        `;
    });
}

function atualizarSelectProdutos() {
    // Atualiza as opções do formulário de vendas baseado nos lanches disponíveis
    selectVendaProduto.innerHTML = '<option value="">-- Selecione um lanche --</option>';
    bancoProdutos.forEach(p => {
        selectVendaProduto.innerHTML += `<option value="${p.id}">${p.nome} - R$ ${p.preco.toFixed(2)}</option>`;
    });
}

// Inicialização na primeira carga da página
salvarEAtualizar();
