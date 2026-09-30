// ============================================================
// CONFIGURAÇÃO DO SUPABASE
// ============================================================

const SUPABASE_URL = 'https://ecwysqwvprjqrioiyooe.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_q6ADp26QiLGrPMKy2DARtg_m1sFNWpQ';

if (!window.supabase) {
    throw new Error(
        'A biblioteca do Supabase não foi carregada. Verifique a conexão com a internet.'
    );
}

const { createClient } = window.supabase;
const clientSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// ============================================================
// ELEMENTOS DA PÁGINA
// ============================================================

const formProduto = document.getElementById('form-produto');
const formVenda = document.getElementById('form-venda');

const selectVendaProduto = document.getElementById('venda-produto');
const inputVendaQtd = document.getElementById('venda-qtd');

const mensagemProduto = document.getElementById('mensagem-produto');
const mensagemVenda = document.getElementById('mensagem-venda');

let bancoProdutos = [];
let bancoVendas = [];


// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

function mostrarMensagem(elemento, mensagem, erro = false) {
    elemento.textContent = mensagem;
    elemento.className = erro ? 'mensagem erro' : 'mensagem sucesso';
}

function limparMensagem(elemento) {
    elemento.textContent = '';
    elemento.className = 'mensagem';
}

function formatarPreco(preco) {
    return Number(preco || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}


// ============================================================
// PRODUTOS - CADASTRAR / EDITAR
// ============================================================

formProduto.addEventListener('submit', async (event) => {
    event.preventDefault();
    limparMensagem(mensagemProduto);

    const id = document.getElementById('prod-id').value.trim();
    const nome = document.getElementById('prod-nome').value.trim();
    const preco = Number(document.getElementById('prod-preco').value);

    if (!nome) {
        mostrarMensagem(mensagemProduto, 'Informe o nome do lanche.', true);
        return;
    }

    if (!Number.isFinite(preco) || preco < 0) {
        mostrarMensagem(mensagemProduto, 'Informe um preço válido.', true);
        return;
    }

    let resultado;

    if (id) {
        resultado = await clientSupabase
            .from('produtos')
            .update({
                nome: nome,
                preco: preco
            })
            .eq('id', id);
    } else {
        resultado = await clientSupabase
            .from('produtos')
            .insert([{
                nome: nome,
                preco: preco
            }]);
    }

    if (resultado.error) {
        console.error('Erro ao salvar produto:', resultado.error);
        mostrarMensagem(
            mensagemProduto,
            `Erro ao salvar produto: ${resultado.error.message}`,
            true
        );
        return;
    }

    formProduto.reset();
    document.getElementById('prod-id').value = '';

    mostrarMensagem(
        mensagemProduto,
        id ? 'Lanche atualizado com sucesso!' : 'Lanche cadastrado com sucesso!'
    );

    await buscarDadosDoBanco();
});


// ============================================================
// PRODUTOS - EXCLUIR
// ============================================================

async function deletarProduto(id) {
    const confirmar = window.confirm(
        'Tem certeza que deseja excluir este lanche?'
    );

    if (!confirmar) return;

    const { error } = await clientSupabase
        .from('produtos')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Erro ao deletar produto:', error);

        if (error.code === '23503') {
            mostrarMensagem(
                mensagemProduto,
                'Não é possível excluir este lanche porque existem vendas relacionadas a ele.',
                true
            );
        } else {
            mostrarMensagem(
                mensagemProduto,
                `Erro ao excluir: ${error.message}`,
                true
            );
        }

        return;
    }

    mostrarMensagem(mensagemProduto, 'Lanche excluído com sucesso!');
    await buscarDadosDoBanco();
}


// ============================================================
// PRODUTOS - EDITAR
// ============================================================

function carregarProdutoParaEdicao(id) {
    const produto = bancoProdutos.find(
        p => String(p.id) === String(id)
    );

    if (!produto) {
        mostrarMensagem(
            mensagemProduto,
            'Produto não encontrado.',
            true
        );
        return;
    }

    document.getElementById('prod-id').value = produto.id;
    document.getElementById('prod-nome').value = produto.nome;
    document.getElementById('prod-preco').value = produto.preco;

    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

window.deletarProduto = deletarProduto;
window.carregarProdutoParaEdicao = carregarProdutoParaEdicao;


// ============================================================
// VENDAS - REGISTRAR
// ============================================================

formVenda.addEventListener('submit', async (event) => {
    event.preventDefault();
    limparMensagem(mensagemVenda);

    const produtoId = Number(selectVendaProduto.value);
    const quantidade = Number(inputVendaQtd.value);

    if (!Number.isInteger(produtoId) || produtoId <= 0) {
        mostrarMensagem(
            mensagemVenda,
            'Selecione um lanche válido.',
            true
        );
        return;
    }

    if (!Number.isInteger(quantidade) || quantidade < 1) {
        mostrarMensagem(
            mensagemVenda,
            'A quantidade deve ser um número inteiro maior que zero.',
            true
        );
        return;
    }

    const { error } = await clientSupabase
        .from('vendas')
        .insert([{
            produto_id: produtoId,
            quantidade: quantidade
        }]);

    if (error) {
        console.error('Erro ao registrar venda:', error);

        mostrarMensagem(
            mensagemVenda,
            `Erro ao registrar venda: ${error.message}`,
            true
        );
        return;
    }

    formVenda.reset();
    inputVendaQtd.value = 1;

    mostrarMensagem(
        mensagemVenda,
        'Venda registrada com sucesso!'
    );

    await buscarDadosDoBanco();
});


// ============================================================
// VENDAS - EXCLUIR
// ============================================================

async function deletarVenda(id) {
    const confirmar = window.confirm(
        'Tem certeza que deseja excluir esta venda?'
    );

    if (!confirmar) return;

    const { error } = await clientSupabase
        .from('vendas')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Erro ao deletar venda:', error);

        mostrarMensagem(
            mensagemVenda,
            `Erro ao excluir venda: ${error.message}`,
            true
        );

        return;
    }

    mostrarMensagem(
        mensagemVenda,
        'Venda excluída com sucesso!'
    );

    await buscarDadosDoBanco();
}

window.deletarVenda = deletarVenda;


// ============================================================
// BUSCAR DADOS NO SUPABASE
// ============================================================

async function buscarDadosDoBanco() {
    selectVendaProduto.innerHTML =
        '<option value="">Carregando lanches...</option>';

    // Busca os produtos
    const resultadoProdutos = await clientSupabase
        .from('produtos')
        .select('id, nome, preco, criado_em')
        .order('id', { ascending: true });

    if (resultadoProdutos.error) {
        console.error(
            'Erro ao buscar produtos:',
            resultadoProdutos.error
        );

        selectVendaProduto.innerHTML =
            '<option value="">Erro ao carregar lanches</option>';

        mostrarMensagem(
            mensagemProduto,
            `Erro ao ler a tabela produtos: ${resultadoProdutos.error.message}`,
            true
        );

        return;
    }

    // Busca as vendas
    const resultadoVendas = await clientSupabase
        .from('vendas')
        .select('id, produto_id, quantidade, criado_em')
        .order('id', { ascending: false });

    if (resultadoVendas.error) {
        console.error(
            'Erro ao buscar vendas:',
            resultadoVendas.error
        );

        mostrarMensagem(
            mensagemVenda,
            `Erro ao ler a tabela vendas: ${resultadoVendas.error.message}`,
            true
        );

        return;
    }

    bancoProdutos = resultadoProdutos.data || [];
    bancoVendas = resultadoVendas.data || [];

    renderizarProdutos();
    atualizarSelectProdutos();
    renderizarVendas();
}


// ============================================================
// RENDERIZAR PRODUTOS
// ============================================================

function renderizarProdutos() {
    const tbody = document.querySelector('#tabela-produtos tbody');

    tbody.innerHTML = '';

    if (bancoProdutos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4">
                    Nenhum lanche cadastrado.
                </td>
            </tr>
        `;
        return;
    }

    bancoProdutos.forEach(produto => {
        const tr = document.createElement('tr');

        const tdId = document.createElement('td');
        tdId.innerHTML = `<strong>${produto.id}</strong>`;

        const tdNome = document.createElement('td');
        tdNome.textContent = produto.nome;

        const tdPreco = document.createElement('td');
        tdPreco.textContent = formatarPreco(produto.preco);

        const tdAcoes = document.createElement('td');

        const btnEditar = document.createElement('button');
        btnEditar.className = 'btn btn-edit';
        btnEditar.textContent = 'Editar';
        btnEditar.type = 'button';
        btnEditar.addEventListener('click', () => {
            carregarProdutoParaEdicao(produto.id);
        });

        const btnExcluir = document.createElement('button');
        btnExcluir.className = 'btn btn-danger';
        btnExcluir.textContent = 'Excluir';
        btnExcluir.type = 'button';
        btnExcluir.addEventListener('click', () => {
            deletarProduto(produto.id);
        });

        tdAcoes.appendChild(btnEditar);
        tdAcoes.appendChild(btnExcluir);

        tr.appendChild(tdId);
        tr.appendChild(tdNome);
        tr.appendChild(tdPreco);
        tr.appendChild(tdAcoes);

        tbody.appendChild(tr);
    });
}


// ============================================================
// PREENCHER SELECT DE PRODUTOS
// ============================================================

function atualizarSelectProdutos() {
    selectVendaProduto.innerHTML = '';

    const opcaoInicial = document.createElement('option');
    opcaoInicial.value = '';
    opcaoInicial.textContent = '-- Selecione um lanche --';

    selectVendaProduto.appendChild(opcaoInicial);

    if (bancoProdutos.length === 0) {
        const opcaoVazia = document.createElement('option');
        opcaoVazia.value = '';
        opcaoVazia.textContent = 'Nenhum lanche cadastrado';
        opcaoVazia.disabled = true;

        selectVendaProduto.appendChild(opcaoVazia);
        return;
    }

    bancoProdutos.forEach(produto => {
        const option = document.createElement('option');

        // O value é exatamente o ID usado pela FK vendas.produto_id.
        option.value = String(produto.id);

        option.textContent =
            `${produto.nome} - ${formatarPreco(produto.preco)}`;

        selectVendaProduto.appendChild(option);
    });
}


// ============================================================
// RENDERIZAR VENDAS
// ============================================================

function renderizarVendas() {
    const tbody = document.querySelector('#tabela-vendas tbody');

    tbody.innerHTML = '';

    if (bancoVendas.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5">
                    Nenhuma venda registrada.
                </td>
            </tr>
        `;
        return;
    }

    bancoVendas.forEach(venda => {
        const produto = bancoProdutos.find(
            p => String(p.id) === String(venda.produto_id)
        );

        const nomeProduto = produto
            ? produto.nome
            : 'Produto não encontrado';

        const precoProduto = produto
            ? Number(produto.preco)
            : 0;

        const total =
            precoProduto * Number(venda.quantidade);

        const tr = document.createElement('tr');

        tr.innerHTML = `
            <td><strong>${venda.id}</strong></td>
            <td>${nomeProduto} (ID: ${venda.produto_id})</td>
            <td>${venda.quantidade}x</td>
            <td>${formatarPreco(total)}</td>
            <td></td>
        `;

        const btnExcluir = document.createElement('button');
        btnExcluir.className = 'btn btn-danger';
        btnExcluir.textContent = 'Excluir';
        btnExcluir.type = 'button';
        btnExcluir.addEventListener('click', () => {
            deletarVenda(venda.id);
        });

        tr.lastElementChild.appendChild(btnExcluir);
        tbody.appendChild(tr);
    });
}


// ============================================================
// INICIALIZAÇÃO
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    buscarDadosDoBanco();
});
