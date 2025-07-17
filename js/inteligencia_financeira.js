/**
 * Sistema de Inteligência Financeira
 * Módulo para análise de receitas e despesas, sugestões de economia e gerenciamento de metas
 */

// ===================== ANÁLISE FINANCEIRA =====================

/**
 * Analisa a situação financeira do usuário comparando receitas e despesas
 * @returns {Promise} Promise com o resultado da análise
 */
function analisarSituacaoFinanceira() {
  return new Promise((resolve, reject) => {
    // Verificar se o usuário está autenticado
    if (!currentUser || !currentUser.uid) {
      console.error("Usuário não autenticado na análise financeira");
      reject(new Error("Usuário não autenticado"));
      return;
    }
    
    console.log("Iniciando análise financeira para usuário:", currentUser.uid);
    
    // Obter ano atual
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    
    // Estrutura para armazenar dados financeiros
    const dadosFinanceiros = {
      receitas: {
        anual: 0,
        mensal: Array(12).fill(0)
      },
      despesas: {
        anual: 0,
        mensal: Array(12).fill(0)
      },
      saldo: {
        anual: 0,
        mensal: Array(12).fill(0)
      }
    };
    
    // Obter apenas as rendas do usuário atual
    console.log(`Buscando pessoas para o usuário: ${currentUser.uid}`);
    db.ref("pessoas").orderByChild("userId").equalTo(currentUser.uid).once("value")
      .then(snapshot => {
        console.log("Snapshot de pessoas:", snapshot.exists() ? "Dados encontrados" : "Nenhum dado");
        if (snapshot.exists()) {
          console.log("Número de registros de pessoas:", snapshot.numChildren());
        }
        
        // Processar rendas apenas do usuário atual
        if (snapshot.exists()) {
          snapshot.forEach(child => {
            const pessoa = child.val();
            console.log("Processando pessoa:", pessoa);
          
          // Adicionar saldo inicial
          if (pessoa.saldoInicial) {
            dadosFinanceiros.receitas.anual += parseFloat(pessoa.saldoInicial) || 0;
          }
          
          // Processar pagamentos mensais
          if (pessoa.pagamentos) {
            pessoa.pagamentos.forEach(pag => {
              const valorMensal = parseFloat(pag.valor) || 0;
              
              // Adicionar ao total anual
              dadosFinanceiros.receitas.anual += valorMensal * 12;
              
              // Adicionar aos totais mensais
              for (let i = 0; i < 12; i++) {
                dadosFinanceiros.receitas.mensal[i] += valorMensal;
              }
            });
          }
        });
        }
        
        // Obter apenas as despesas do usuário atual
        console.log(`Buscando despesas para o usuário: ${currentUser.uid}`);
        return db.ref("despesas").orderByChild("userId").equalTo(currentUser.uid).once("value");
      })
      .then(snapshot => {
        console.log("Snapshot de despesas:", snapshot.exists() ? "Dados encontrados" : "Nenhum dado");
        if (snapshot.exists()) {
          console.log("Número de registros de despesas:", snapshot.numChildren());
        }
        
        // Processar despesas apenas do usuário atual
        if (snapshot.exists()) {
          snapshot.forEach(child => {
            const despesa = child.val();
            console.log("Processando despesa:", despesa);
          
          // Processar despesas à vista
          if (despesa.formaPagamento === "avista" && despesa.dataCompra) {
            const dataCompra = new Date(despesa.dataCompra);
            
            // Verificar se é do ano atual
            if (dataCompra.getFullYear() === anoAtual) {
              const valor = parseFloat(despesa.valor) || 0;
              const mes = dataCompra.getMonth();
              
              // Adicionar ao total anual
              dadosFinanceiros.despesas.anual += valor;
              
              // Adicionar ao total mensal
              dadosFinanceiros.despesas.mensal[mes] += valor;
            }
          } 
          // Processar despesas parceladas
          else if (despesa.formaPagamento === "cartao" && despesa.parcelas) {
            despesa.parcelas.forEach(parcela => {
              const dataVencimento = new Date(parcela.vencimento);
              
              // Verificar se é do ano atual
              if (dataVencimento.getFullYear() === anoAtual) {
                const valor = parseFloat(parcela.valor) || 0;
                const mes = dataVencimento.getMonth();
                
                // Adicionar ao total anual
                dadosFinanceiros.despesas.anual += valor;
                
                // Adicionar ao total mensal
                dadosFinanceiros.despesas.mensal[mes] += valor;
              }
            });
          }
          });
        }
        
        // Calcular saldos
        dadosFinanceiros.saldo.anual = dadosFinanceiros.receitas.anual - dadosFinanceiros.despesas.anual;
        
        for (let i = 0; i < 12; i++) {
          dadosFinanceiros.saldo.mensal[i] = dadosFinanceiros.receitas.mensal[i] - dadosFinanceiros.despesas.mensal[i];
        }
        
        console.log("Análise financeira concluída:", dadosFinanceiros);
        resolve(dadosFinanceiros);
      })
      .catch(error => {
        console.error("Erro ao analisar situação financeira:", error);
        reject(error);
      });
  });
}

/**
 * Gera recomendações baseadas na análise financeira
 * @param {Object} dadosFinanceiros - Dados financeiros do usuário
 * @returns {Object} Objeto com recomendações
 */
function gerarRecomendacoes(dadosFinanceiros) {
  const recomendacoes = {
    situacao: '',
    mensagem: '',
    acoes: [],
    economia: [],
    disponibilidade: 0
  };
  
  // Analisar situação geral
  if (dadosFinanceiros.saldo.anual > 0) {
    const percentualSaldo = (dadosFinanceiros.saldo.anual / dadosFinanceiros.receitas.anual) * 100;
    
    if (percentualSaldo > 30) {
      recomendacoes.situacao = 'excelente';
      recomendacoes.mensagem = 'Sua situação financeira está excelente! Você está economizando mais de 30% da sua renda anual.';
      recomendacoes.acoes.push('Considere investir o excedente para fazer seu dinheiro render mais.');
      recomendacoes.acoes.push('Estabeleça metas de longo prazo para aproveitar sua boa situação financeira.');
    } else if (percentualSaldo > 15) {
      recomendacoes.situacao = 'boa';
      recomendacoes.mensagem = 'Sua situação financeira está boa. Você está economizando entre 15% e 30% da sua renda anual.';
      recomendacoes.acoes.push('Continue mantendo o controle dos seus gastos.');
      recomendacoes.acoes.push('Considere aumentar sua reserva de emergência ou iniciar investimentos.');
    } else {
      recomendacoes.situacao = 'regular';
      recomendacoes.mensagem = 'Sua situação financeira está regular. Você está economizando menos de 15% da sua renda anual.';
      recomendacoes.acoes.push('Tente aumentar sua taxa de economia para pelo menos 20% da renda.');
      recomendacoes.acoes.push('Revise seus gastos mensais para identificar oportunidades de economia.');
    }
    
    // Calcular disponibilidade mensal média
    recomendacoes.disponibilidade = dadosFinanceiros.saldo.anual / 12;
  } else {
    recomendacoes.situacao = 'preocupante';
    recomendacoes.mensagem = 'Sua situação financeira está preocupante. Suas despesas anuais superam suas receitas.';
    recomendacoes.acoes.push('Reduza despesas não essenciais imediatamente.');
    recomendacoes.acoes.push('Busque aumentar sua renda ou renegociar dívidas.');
    recomendacoes.disponibilidade = 0;
  }
  
  // Analisar meses problemáticos
  const mesesNegativos = [];
  for (let i = 0; i < 12; i++) {
    if (dadosFinanceiros.saldo.mensal[i] < 0) {
      mesesNegativos.push({
        mes: i,
        nome: new Date(2025, i, 1).toLocaleString('pt-BR', { month: 'long' }),
        deficit: Math.abs(dadosFinanceiros.saldo.mensal[i])
      });
    }
  }
  
  if (mesesNegativos.length > 0) {
    recomendacoes.acoes.push(`Atenção especial aos meses: ${mesesNegativos.map(m => m.nome).join(', ')}, onde suas despesas superam as receitas.`);
  }
  
  // Gerar sugestões de economia
  recomendacoes.economia = [
    'Revise assinaturas e serviços recorrentes que você não utiliza com frequência.',
    'Compare preços antes de fazer compras, especialmente para itens de maior valor.',
    'Estabeleça um orçamento mensal para categorias como alimentação e lazer.',
    'Considere renegociar dívidas com juros altos.',
    'Planeje compras grandes com antecedência para evitar parcelamentos.'
  ];
  
  return recomendacoes;
}

/**
 * Analisa gastos por categoria para identificar oportunidades de economia
 * @returns {Promise} Promise com o resultado da análise
 */
function analisarGastosPorCategoria() {
  return new Promise((resolve, reject) => {
    // Verificar se o usuário está autenticado
    if (!currentUser || !currentUser.uid) {
      console.error("Usuário não autenticado na análise de gastos por categoria");
      reject(new Error("Usuário não autenticado"));
      return;
    }
    
    console.log("Iniciando análise de gastos por categoria para usuário:", currentUser.uid);
    
    // Obter ano atual
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth();
    
    // Estrutura para armazenar gastos por categoria
    const gastosPorCategoria = {};
    
    // Obter limites de categorias apenas do usuário atual
    console.log(`Buscando limites de categorias para o usuário: ${currentUser.uid}`);
    db.ref(`users/${currentUser.uid}/data/limites_categorias`).once("value")
      .then(limSnapshot => {
        console.log("Snapshot de limites:", limSnapshot.exists() ? "Dados encontrados" : "Nenhum dado");
        if (limSnapshot.exists()) {
          console.log("Número de limites encontrados:", limSnapshot.numChildren());
        }
        
        // Processar limites
        if (limSnapshot.exists()) {
          limSnapshot.forEach(child => {
            const categoriaId = child.key;
            const limite = parseFloat(child.val().limite) || 0;
            
            gastosPorCategoria[categoriaId] = {
              id: categoriaId,
              nome: window.novo_categoriasMap[categoriaId] || "Categoria",
              limite: limite,
              gasto: 0,
              percentual: 0,
              tendencia: 0,
              historico: Array(6).fill(0) // Últimos 6 meses
            };
          });
        }
        
        // Obter categorias que não têm limites apenas do usuário atual
        return db.ref(`users/${currentUser.uid}/data/categorias`).once("value");
      })
      .then(catSnapshot => {
        // Processar categorias sem limites
        if (catSnapshot.exists()) {
          catSnapshot.forEach(child => {
            const categoriaId = child.key;
          
          if (!gastosPorCategoria[categoriaId]) {
            gastosPorCategoria[categoriaId] = {
              id: categoriaId,
              nome: child.val().nome,
              limite: 0,
              gasto: 0,
              percentual: 0,
              tendencia: 0,
              historico: Array(6).fill(0) // Últimos 6 meses
            };
          }
          });
        }
        
        // Obter despesas apenas do usuário atual
        return db.ref("despesas").orderByChild("userId").equalTo(currentUser.uid).once("value");
      })
      .then(snapshot => {
        // Processar despesas apenas do usuário atual
        if (snapshot.exists()) {
          snapshot.forEach(child => {
            const despesa = child.val();
            const categoriaId = despesa.categoria;
          
          // Ignorar despesas sem categoria
          if (!categoriaId || !gastosPorCategoria[categoriaId]) return;
          
          // Processar despesas à vista
          if (despesa.formaPagamento === "avista" && despesa.dataCompra) {
            const dataCompra = new Date(despesa.dataCompra);
            const mes = dataCompra.getMonth();
            const ano = dataCompra.getFullYear();
            const valor = parseFloat(despesa.valor) || 0;
            
            // Verificar se é do mês atual do ano atual
            if (mes === mesAtual && ano === anoAtual) {
              gastosPorCategoria[categoriaId].gasto += valor;
            }
            
            // Adicionar ao histórico (últimos 6 meses)
            for (let i = 0; i < 6; i++) {
              let mesHistorico = mesAtual - i;
              let anoHistorico = anoAtual;
              
              if (mesHistorico < 0) {
                mesHistorico += 12;
                anoHistorico--;
              }
              
              if (mes === mesHistorico && ano === anoHistorico) {
                gastosPorCategoria[categoriaId].historico[i] += valor;
              }
            }
          } 
          // Processar despesas parceladas
          else if (despesa.formaPagamento === "cartao" && despesa.parcelas) {
            despesa.parcelas.forEach(parcela => {
              const dataVencimento = new Date(parcela.vencimento);
              const mes = dataVencimento.getMonth();
              const ano = dataVencimento.getFullYear();
              const valor = parseFloat(parcela.valor) || 0;
              
              // Verificar se é do mês atual do ano atual
              if (mes === mesAtual && ano === anoAtual) {
                gastosPorCategoria[categoriaId].gasto += valor;
              }
              
              // Adicionar ao histórico (últimos 6 meses)
              for (let i = 0; i < 6; i++) {
                let mesHistorico = mesAtual - i;
                let anoHistorico = anoAtual;
                
                if (mesHistorico < 0) {
                  mesHistorico += 12;
                  anoHistorico--;
                }
                
                if (mes === mesHistorico && ano === anoHistorico) {
                  gastosPorCategoria[categoriaId].historico[i] += valor;
                }
              }
            });
          }
          });
        }
        
        // Calcular percentuais e tendências
        Object.keys(gastosPorCategoria).forEach(categoriaId => {
          const categoria = gastosPorCategoria[categoriaId];
          
          // Calcular percentual do limite
          if (categoria.limite > 0) {
            categoria.percentual = (categoria.gasto / categoria.limite) * 100;
          }
          
          // Calcular tendência (comparação com média dos últimos 3 meses)
          const ultimosTresMeses = categoria.historico.slice(1, 4);
          const mediaTresMeses = ultimosTresMeses.reduce((a, b) => a + b, 0) / 3;
          
          if (mediaTresMeses > 0) {
            categoria.tendencia = ((categoria.gasto - mediaTresMeses) / mediaTresMeses) * 100;
          }
        });
        
        // Filtrar apenas categorias com gastos
        const categoriasComGastos = Object.values(gastosPorCategoria).filter(cat => cat.gasto > 0);
        
        // Ordenar por percentual do limite (decrescente)
        categoriasComGastos.sort((a, b) => b.percentual - a.percentual);
        
        resolve(categoriasComGastos);
      })
      .catch(error => {
        console.error("Erro ao analisar gastos por categoria:", error);
        reject(error);
      });
  });
}

// ===================== METAS FINANCEIRAS =====================

/**
 * Carrega as metas financeiras do usuário
 * @returns {Promise} Promise com as metas do usuário
 */
function carregarMetas() {
  return new Promise((resolve, reject) => {
    // Verificar se o usuário está autenticado
    if (!currentUser || !currentUser.uid) {
      console.error("Usuário não autenticado ao carregar metas");
      reject(new Error("Usuário não autenticado"));
      return;
    }
    
    console.log("Iniciando carregamento de metas para usuário:", currentUser.uid);
    
    // Buscar apenas as metas do usuário atual
    console.log(`Buscando metas para o usuário: ${currentUser.uid}`);
    db.ref(`users/${currentUser.uid}/data/metas`).once("value")
      .then(snapshot => {
        console.log("Snapshot de metas:", snapshot.exists() ? "Dados encontrados" : "Nenhum dado");
        if (snapshot.exists()) {
          console.log("Número de metas encontradas:", snapshot.numChildren());
        }
        
        const metas = [];
        
        if (snapshot.exists()) {
          snapshot.forEach(child => {
            metas.push({
              id: child.key,
              ...child.val()
            });
          });
        }
        
        resolve(metas);
      })
      .catch(error => {
        console.error("Erro ao carregar metas:", error);
        reject(error);
      });
  });
}

/**
 * Salva uma nova meta financeira
 * @param {Object} meta - Dados da meta
 * @returns {Promise} Promise com o resultado da operação
 */
function salvarMeta(meta) {
  return new Promise((resolve, reject) => {
    // Validar dados da meta
    if (!meta.titulo || !meta.valor || !meta.dataAlvo) {
      reject(new Error("Dados da meta incompletos"));
      return;
    }
    
    // Verificar se o usuário está autenticado
    if (!currentUser || !currentUser.uid) {
      reject(new Error("Usuário não autenticado"));
      return;
    }
    
    // Preparar dados para salvar
    const metaData = {
      titulo: meta.titulo,
      descricao: meta.descricao || "",
      valor: parseFloat(meta.valor),
      valorAtual: parseFloat(meta.valorAtual || 0),
      dataAlvo: meta.dataAlvo,
      dataCriacao: meta.dataCriacao || new Date().toISOString(),
      categoria: meta.categoria || "outros"
    };
    
    // Salvar no Firebase apenas no espaço do usuário
    let ref;
    if (meta.id) {
      // Atualizar meta existente
      ref = db.ref(`users/${currentUser.uid}/data/metas/${meta.id}`).update(metaData);
    } else {
      // Criar nova meta
      ref = db.ref(`users/${currentUser.uid}/data/metas`).push(metaData);
    }
    
    ref.then(() => {
      resolve({ success: true });
    }).catch(error => {
      console.error("Erro ao salvar meta:", error);
      reject(error);
    });
  });
}

/**
 * Atualiza o progresso de uma meta
 * @param {string} metaId - ID da meta
 * @param {number} novoValor - Novo valor acumulado
 * @returns {Promise} Promise com o resultado da operação
 */
function atualizarProgressoMeta(metaId, novoValor) {
  return new Promise((resolve, reject) => {
    if (!metaId) {
      reject(new Error("ID da meta não informado"));
      return;
    }
    
    // Verificar se o usuário está autenticado
    if (!currentUser || !currentUser.uid) {
      reject(new Error("Usuário não autenticado"));
      return;
    }
    
    // Atualizar valor da meta (verificação de usuário já feita antes)
    db.ref(`users/${currentUser.uid}/data/metas/${metaId}/valorAtual`).set(parseFloat(novoValor))
      .then(() => {
        resolve({ success: true });
      })
      .catch(error => {
        console.error("Erro ao atualizar progresso da meta:", error);
        reject(error);
      });
  });
}

/**
 * Exclui uma meta financeira
 * @param {string} metaId - ID da meta
 * @returns {Promise} Promise com o resultado da operação
 */
function excluirMeta(metaId) {
  return new Promise((resolve, reject) => {
    if (!metaId) {
      reject(new Error("ID da meta não informado"));
      return;
    }
    
    // Verificar se o usuário está autenticado
    if (!currentUser || !currentUser.uid) {
      reject(new Error("Usuário não autenticado"));
      return;
    }
    
    // Excluir meta (verificação de usuário já feita antes)
    db.ref(`users/${currentUser.uid}/data/metas/${metaId}`).remove()
      .then(() => {
        resolve({ success: true });
      })
      .catch(error => {
        console.error("Erro ao excluir meta:", error);
        reject(error);
      });
  });
}

/**
 * Calcula o tempo restante para atingir uma meta com base no ritmo atual de economia
 * @param {Object} meta - Dados da meta
 * @param {number} economiaMediaMensal - Economia média mensal
 * @returns {Object} Objeto com informações sobre o tempo restante
 */
function calcularTempoRestanteMeta(meta, economiaMediaMensal) {
  const valorRestante = meta.valor - meta.valorAtual;
  
  // Se já atingiu a meta ou não há economia mensal
  if (valorRestante <= 0) {
    return {
      atingida: true,
      mesesRestantes: 0,
      mensagem: "Meta já atingida!"
    };
  }
  
  if (economiaMediaMensal <= 0) {
    return {
      atingida: false,
      mesesRestantes: Infinity,
      mensagem: "Impossível calcular o tempo restante com a economia atual."
    };
  }
  
  // Calcular meses restantes
  const mesesRestantes = valorRestante / economiaMediaMensal;
  
  // Calcular data estimada
  const hoje = new Date();
  const dataEstimada = new Date(hoje);
  dataEstimada.setMonth(hoje.getMonth() + Math.ceil(mesesRestantes));
  
  // Verificar se está dentro do prazo
  const dataAlvo = new Date(meta.dataAlvo);
  const dentroDoPrazo = dataEstimada <= dataAlvo;
  
  return {
    atingida: false,
    mesesRestantes: mesesRestantes,
    dataEstimada: dataEstimada,
    dentroDoPrazo: dentroDoPrazo,
    mensagem: dentroDoPrazo 
      ? `No ritmo atual, você atingirá a meta em aproximadamente ${Math.ceil(mesesRestantes)} meses.`
      : `No ritmo atual, você atingirá a meta em aproximadamente ${Math.ceil(mesesRestantes)} meses, o que ultrapassa o prazo estabelecido.`
  };
}

// ===================== INTERFACE DO USUÁRIO =====================

/**
 * Renderiza o painel de inteligência financeira
 */
function renderizarPainelInteligencia() {
  console.log("Iniciando renderização do painel de inteligência financeira");
  const container = document.getElementById("inteligenciaFinanceiraContainer");
  if (!container) {
    console.error("Container de inteligência financeira não encontrado no DOM");
    return;
  }
  
  // Verificar se usuário está autenticado
  if (!currentUser || !currentUser.uid) {
    console.error("Tentativa de renderizar painel sem usuário autenticado");
    container.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-circle"></i>
        <p>Você precisa estar autenticado para acessar a inteligência financeira.</p>
      </div>
    `;
    return;
  }
  
  console.log("Usuário autenticado:", currentUser.uid);
  container.innerHTML = `
    <div class="loading-spinner">
      <i class="fas fa-spinner fa-spin"></i>
      <span>Analisando seus dados financeiros...</span>
    </div>
  `;
  
  // Analisar situação financeira
  console.log("Chamando análise financeira");
  analisarSituacaoFinanceira()
    .then(dadosFinanceiros => {
      console.log("Análise financeira concluída com sucesso:", dadosFinanceiros);
      // Verificar se os dados são válidos
      if (!dadosFinanceiros || typeof dadosFinanceiros !== 'object') {
        console.error("Dados financeiros inválidos:", dadosFinanceiros);
        throw new Error("Dados financeiros inválidos ou vazios");
      }
      
      // Gerar recomendações
      console.log("Gerando recomendações baseadas nos dados financeiros");
      const recomendacoes = gerarRecomendacoes(dadosFinanceiros);
      
      // Renderizar painel
      container.innerHTML = `
        <div class="inteligencia-header ${recomendacoes.situacao}">
          <div class="inteligencia-icon">
            <i class="fas fa-${recomendacoes.situacao === 'excelente' ? 'award' : 
                              recomendacoes.situacao === 'boa' ? 'thumbs-up' : 
                              recomendacoes.situacao === 'regular' ? 'balance-scale' : 
                              'exclamation-triangle'}"></i>
          </div>
          <div class="inteligencia-title">
            <h3>Análise Financeira</h3>
            <p>${recomendacoes.mensagem}</p>
          </div>
        </div>
        
        <div class="inteligencia-section">
          <h4><i class="fas fa-chart-line"></i> Visão Geral</h4>
          <div class="inteligencia-cards">
            <div class="inteligencia-card">
              <div class="inteligencia-card-title">Receita Anual</div>
              <div class="inteligencia-card-value">R$ ${dadosFinanceiros.receitas.anual.toFixed(2)}</div>
            </div>
            <div class="inteligencia-card">
              <div class="inteligencia-card-title">Despesa Anual</div>
              <div class="inteligencia-card-value">R$ ${dadosFinanceiros.despesas.anual.toFixed(2)}</div>
            </div>
            <div class="inteligencia-card ${dadosFinanceiros.saldo.anual >= 0 ? 'positive' : 'negative'}">
              <div class="inteligencia-card-title">Saldo Anual</div>
              <div class="inteligencia-card-value">R$ ${dadosFinanceiros.saldo.anual.toFixed(2)}</div>
            </div>
          </div>
          
          <div id="graficoSaldoMensal" class="inteligencia-chart"></div>
        </div>
        
        <div class="inteligencia-section">
          <h4><i class="fas fa-lightbulb"></i> Recomendações</h4>
          <ul class="inteligencia-list">
            ${recomendacoes.acoes.map(acao => `<li>${acao}</li>`).join('')}
          </ul>
        </div>
        
        <div class="inteligencia-section">
          <h4><i class="fas fa-piggy-bank"></i> Sugestões de Economia</h4>
          <ul class="inteligencia-list">
            ${recomendacoes.economia.map(dica => `<li>${dica}</li>`).join('')}
          </ul>
        </div>
        
        <div class="inteligencia-section">
          <h4><i class="fas fa-tags"></i> Análise por Categoria</h4>
          <div id="analiseCategoriasContainer" class="loading-container">
            <div class="loading-spinner">
              <i class="fas fa-spinner fa-spin"></i>
              <span>Carregando análise de categorias...</span>
            </div>
          </div>
        </div>
      `;
      
      // Renderizar gráfico de saldo mensal
      renderizarGraficoSaldoMensal(dadosFinanceiros);
      
      // Carregar análise por categoria
      return analisarGastosPorCategoria();
    })
    .then(categoriasAnalise => {
      // Renderizar análise por categoria
      renderizarAnaliseCategoria(categoriasAnalise);
    })
    .catch(error => {
      console.error("Erro ao renderizar painel de inteligência:", error);
      container.innerHTML = `
        <div class="error-message">
          <i class="fas fa-exclamation-circle"></i>
          <p>Erro ao analisar dados financeiros: ${error.message}</p>
          <p>Verifique o console para mais detalhes.</p>
        </div>
      `;
    });
}

/**
 * Renderiza o gráfico de saldo mensal
 * @param {Object} dadosFinanceiros - Dados financeiros do usuário
 */
function renderizarGraficoSaldoMensal(dadosFinanceiros) {
  const container = document.getElementById("graficoSaldoMensal");
  if (!container) return;
  
  // Preparar dados para o gráfico
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  
  const options = {
    series: [
      {
        name: 'Receitas',
        data: dadosFinanceiros.receitas.mensal
      },
      {
        name: 'Despesas',
        data: dadosFinanceiros.despesas.mensal
      },
      {
        name: 'Saldo',
        data: dadosFinanceiros.saldo.mensal,
        type: 'line'
      }
    ],
    chart: {
      type: 'bar',
      height: 350,
      stacked: false,
      toolbar: {
        show: true
      }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '55%',
        endingShape: 'rounded'
      },
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      show: true,
      width: [0, 0, 3],
      curve: 'smooth'
    },
    xaxis: {
      categories: meses,
    },
    yaxis: {
      title: {
        text: 'Valor (R$)'
      },
      labels: {
        formatter: function (value) {
          return "R$ " + value.toFixed(0);
        }
      }
    },
    tooltip: {
      y: {
        formatter: function (value) {
          return "R$ " + value.toFixed(2);
        }
      }
    },
    fill: {
      opacity: [0.85, 0.85, 1],
      type: ['solid', 'solid', 'solid']
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      offsetX: 40
    },
    colors: ['#4caf50', '#f44336', '#2196f3']
  };
  
  // Criar gráfico
  const chart = new ApexCharts(container, options);
  chart.render();
}

/**
 * Renderiza a análise por categoria
 * @param {Array} categorias - Lista de categorias analisadas
 */
function renderizarAnaliseCategoria(categorias) {
  const container = document.getElementById("analiseCategoriasContainer");
  if (!container) return;
  
  if (categorias.length === 0) {
    container.innerHTML = `
      <p>Não há dados suficientes para análise de categorias.</p>
    `;
    return;
  }
  
  // Criar HTML para a análise
  let html = `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Categoria</th>
            <th>Gasto Atual</th>
            <th>Limite</th>
            <th>% do Limite</th>
            <th>Tendência</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  categorias.forEach(categoria => {
    const percentualFormatado = categoria.percentual.toFixed(0);
    const tendenciaFormatada = categoria.tendencia.toFixed(1);
    const tendenciaClasse = categoria.tendencia > 10 ? 'negative' : 
                           categoria.tendencia < -10 ? 'positive' : '';
    const percentualClasse = categoria.percentual >= 100 ? 'negative' : 
                            categoria.percentual >= 80 ? 'warning' : 'positive';
    
    html += `
      <tr>
        <td>${categoria.nome}</td>
        <td>R$ ${categoria.gasto.toFixed(2)}</td>
        <td>${categoria.limite > 0 ? 'R$ ' + categoria.limite.toFixed(2) : 'Não definido'}</td>
        <td class="${percentualClasse}">
          ${categoria.limite > 0 ? percentualFormatado + '%' : '-'}
          ${categoria.limite > 0 ? `
            <div class="progress-bar-container">
              <div class="progress-bar ${percentualClasse}" style="width: ${Math.min(100, categoria.percentual)}%"></div>
            </div>
          ` : ''}
        </td>
        <td class="${tendenciaClasse}">
          ${categoria.tendencia > 0 ? '+' : ''}${tendenciaFormatada}%
          <i class="fas fa-${categoria.tendencia > 10 ? 'arrow-up' : 
                            categoria.tendencia < -10 ? 'arrow-down' : 'equals'}"></i>
        </td>
      </tr>
    `;
  });
  
  html += `
        </tbody>
      </table>
    </div>
    
    <div class="inteligencia-insights">
      <h5><i class="fas fa-info-circle"></i> Insights</h5>
      <ul>
  `;
  
  // Adicionar insights baseados na análise
  const categoriasAcimaDeLimite = categorias.filter(c => c.percentual >= 100);
  const categoriasProximasDoLimite = categorias.filter(c => c.percentual >= 80 && c.percentual < 100);
  const categoriasTendenciaAlta = categorias.filter(c => c.tendencia > 20);
  
  if (categoriasAcimaDeLimite.length > 0) {
    html += `
      <li class="insight-critical">
        Você ultrapassou o limite em ${categoriasAcimaDeLimite.length} ${categoriasAcimaDeLimite.length === 1 ? 'categoria' : 'categorias'}: 
        ${categoriasAcimaDeLimite.map(c => c.nome).join(', ')}.
      </li>
    `;
  }
  
  if (categoriasProximasDoLimite.length > 0) {
    html += `
      <li class="insight-warning">
        Você está próximo do limite em ${categoriasProximasDoLimite.length} ${categoriasProximasDoLimite.length === 1 ? 'categoria' : 'categorias'}: 
        ${categoriasProximasDoLimite.map(c => c.nome).join(', ')}.
      </li>
    `;
  }
  
  if (categoriasTendenciaAlta.length > 0) {
    html += `
      <li class="insight-warning">
        Seus gastos estão aumentando significativamente em: 
        ${categoriasTendenciaAlta.map(c => c.nome).join(', ')}.
      </li>
    `;
  }
  
  // Adicionar sugestões específicas para as categorias mais problemáticas
  const categoriasMaisProblematicas = [...categoriasAcimaDeLimite, ...categoriasTendenciaAlta]
    .filter((c, i, arr) => arr.findIndex(t => t.id === c.id) === i)
    .slice(0, 3);
  
  if (categoriasMaisProblematicas.length > 0) {
    html += `
      <li class="insight-info">
        Sugestões de economia para categorias críticas:
        <ul>
    `;
    
    categoriasMaisProblematicas.forEach(categoria => {
      const sugestoes = obterSugestoesPorCategoria(categoria.nome.toLowerCase());
      if (sugestoes.length > 0) {
        html += `
          <li><strong>${categoria.nome}:</strong> ${sugestoes[0]}</li>
        `;
      }
    });
    
    html += `
        </ul>
      </li>
    `;
  }
  
  html += `
      </ul>
    </div>
  `;
  
  container.innerHTML = html;
}

/**
 * Obtém sugestões de economia específicas para uma categoria
 * @param {string} categoria - Nome da categoria
 * @returns {Array} Lista de sugestões
 */
function obterSugestoesPorCategoria(categoria) {
  const sugestoes = {
    'alimentação': [
      'Planeje refeições semanalmente para evitar desperdícios e compras por impulso.',
      'Prefira cozinhar em casa em vez de pedir delivery ou comer fora.',
      'Compare preços em diferentes mercados e aproveite promoções.'
    ],
    'transporte': [
      'Considere usar transporte público ou compartilhado quando possível.',
      'Planeje rotas para economizar combustível.',
      'Mantenha seu veículo em boas condições para evitar gastos maiores com reparos.'
    ],
    'moradia': [
      'Revise contratos de serviços como internet, TV e telefone para encontrar planos mais econômicos.',
      'Adote medidas de economia de energia e água.',
      'Avalie a possibilidade de renegociar aluguel ou financiamento.'
    ],
    'saúde': [
      'Compare preços de medicamentos em diferentes farmácias.',
      'Verifique se seu plano de saúde está adequado às suas necessidades.',
      'Priorize a medicina preventiva para evitar gastos maiores com tratamentos.'
    ],
    'educação': [
      'Busque bolsas de estudo ou descontos em instituições de ensino.',
      'Considere cursos online que geralmente são mais acessíveis.',
      'Compartilhe materiais didáticos com colegas.'
    ],
    'lazer': [
      'Procure opções gratuitas ou de baixo custo para entretenimento.',
      'Aproveite promoções e descontos em atividades culturais.',
      'Estabeleça um orçamento mensal específico para lazer.'
    ],
    'outros': [
      'Revise assinaturas e serviços recorrentes que você não utiliza com frequência.',
      'Evite compras por impulso, especialmente online.',
      'Considere comprar itens usados ou recondicionados quando apropriado.'
    ]
  };
  
  // Buscar sugestões para a categoria específica ou retornar sugestões gerais
  return sugestoes[categoria] || sugestoes['outros'];
}

/**
 * Renderiza o painel de metas financeiras
 */
function renderizarPainelMetas() {
  const container = document.getElementById("metasFinanceirasContainer");
  if (!container) return;
  
  container.innerHTML = `
    <div class="loading-spinner">
      <i class="fas fa-spinner fa-spin"></i>
      <span>Carregando suas metas financeiras...</span>
    </div>
  `;
  
  // Carregar metas
  carregarMetas()
    .then(metas => {
      // Analisar situação financeira para obter economia média
      return analisarSituacaoFinanceira().then(dadosFinanceiros => {
        const economiaMediaMensal = dadosFinanceiros.saldo.anual / 12;
        return { metas, economiaMediaMensal };
      });
    })
    .then(({ metas, economiaMediaMensal }) => {
      // Renderizar painel
      let html = `
        <div class="d-flex gap-2 flex-wrap mb-3">
          <button class="btn btn-primary" onclick="abrirModal('novametaModal')">
            <i class="fas fa-plus"></i>
            <span>Nova Meta</span>
          </button>
        </div>
      `;
      
      if (metas.length === 0) {
        html += `
          <div class="empty-state">
            <i class="fas fa-bullseye"></i>
            <p>Você ainda não tem metas financeiras cadastradas.</p>
            <p>Crie sua primeira meta para começar a planejar seu futuro financeiro!</p>
          </div>
        `;
      } else {
        html += `<div class="metas-grid">`;
        
        metas.forEach(meta => {
          const valorAtual = parseFloat(meta.valorAtual) || 0;
          const valorMeta = parseFloat(meta.valor) || 0;
          const percentual = valorMeta > 0 ? (valorAtual / valorMeta) * 100 : 0;
          const dataAlvo = new Date(meta.dataAlvo);
          const hoje = new Date();
          const diasRestantes = Math.ceil((dataAlvo - hoje) / (1000 * 60 * 60 * 24));
          
          // Calcular tempo restante com base na economia média
          const tempoRestante = calcularTempoRestanteMeta(meta, economiaMediaMensal);
          
          html += `
            <div class="meta-card">
              <div class="meta-header">
                <h3 class="meta-title">${meta.titulo}</h3>
                <div class="meta-actions">
                  <button class="btn-icon" onclick="abrirModalEditarMeta('${meta.id}')">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button class="btn-icon btn-danger" onclick="confirmarExclusaoMeta('${meta.id}')">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
              
              <div class="meta-body">
                <div class="meta-info">
                  <div class="meta-value">
                    <span>Meta: R$ ${valorMeta.toFixed(2)}</span>
                    <span>Atual: R$ ${valorAtual.toFixed(2)}</span>
                  </div>
                  <div class="meta-date">
                    <span>Data alvo: ${dataAlvo.toLocaleDateString()}</span>
                    <span class="${diasRestantes < 0 ? 'negative' : diasRestantes < 30 ? 'warning' : ''}">
                      ${diasRestantes < 0 ? 'Vencida há ' + Math.abs(diasRestantes) + ' dias' : 'Faltam ' + diasRestantes + ' dias'}
                    </span>
                  </div>
                </div>
                
                <div class="meta-progress">
                  <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${percentual}%"></div>
                  </div>
                  <span class="progress-text">${percentual.toFixed(1)}% concluído</span>
                </div>
                
                <div class="meta-analysis">
                  <i class="fas fa-${tempoRestante.dentroDoPrazo ? 'check-circle' : 'exclamation-circle'}"></i>
                  <span>${tempoRestante.mensagem}</span>
                </div>
              </div>
              
              <div class="meta-footer">
                <button class="btn btn-sm btn-primary" onclick="abrirModalAtualizarMeta('${meta.id}')">
                  <i class="fas fa-plus-circle"></i>
                  <span>Atualizar Progresso</span>
                </button>
              </div>
            </div>
          `;
        });
        
        html += `</div>`;
      }
      
      container.innerHTML = html;
    })
    .catch(error => {
      console.error("Erro ao renderizar painel de metas:", error);
      container.innerHTML = `
        <div class="error-message">
          <i class="fas fa-exclamation-circle"></i>
          <p>Erro ao carregar metas financeiras. Tente novamente mais tarde.</p>
        </div>
      `;
    });
}

/**
 * Abre o modal para editar uma meta
 * @param {string} metaId - ID da meta a ser editada
 */
function abrirModalEditarMeta(metaId) {
  // Carregar dados da meta - buscar apenas metas do usuário atual
  db.ref(`users/${currentUser.uid}/data/metas/${metaId}`).once("value")
    .then(snapshot => {
      if (snapshot.exists()) {
        const meta = snapshot.val();
        
        // Preencher formulário
        document.getElementById("metaId").value = metaId;
        document.getElementById("metaTitulo").value = meta.titulo || "";
        document.getElementById("metaDescricao").value = meta.descricao || "";
        document.getElementById("metaValor").value = meta.valor || "";
        document.getElementById("metaValorAtual").value = meta.valorAtual || "";
        document.getElementById("metaDataAlvo").value = meta.dataAlvo ? meta.dataAlvo.split("T")[0] : "";
        
        // Selecionar categoria
        const categoriaSelect = document.getElementById("metaCategoria");
        if (categoriaSelect) {
          for (let i = 0; i < categoriaSelect.options.length; i++) {
            if (categoriaSelect.options[i].value === meta.categoria) {
              categoriaSelect.selectedIndex = i;
              break;
            }
          }
        }
        
        // Abrir modal
        abrirModal("novametaModal");
      } else {
        exibirToast("Meta não encontrada", "danger");
      }
    })
    .catch(error => {
      console.error("Erro ao carregar meta:", error);
      exibirToast("Erro ao carregar meta: " + error.message, "danger");
    });
}

/**
 * Abre o modal para atualizar o progresso de uma meta
 * @param {string} metaId - ID da meta a ser atualizada
 */
function abrirModalAtualizarMeta(metaId) {
  // Carregar dados da meta - buscar apenas metas do usuário atual
  db.ref(`users/${currentUser.uid}/data/metas/${metaId}`).once("value")
    .then(snapshot => {
      if (snapshot.exists()) {
        const meta = snapshot.val();
        
        // Preencher formulário
        document.getElementById("atualizarMetaId").value = metaId;
        document.getElementById("atualizarMetaTitulo").innerText = meta.titulo;
        document.getElementById("atualizarMetaValorAtual").value = meta.valorAtual || 0;
        document.getElementById("atualizarMetaValorTotal").innerText = `R$ ${parseFloat(meta.valor).toFixed(2)}`;
        
        // Abrir modal
        abrirModal("atualizarMetaModal");
      } else {
        exibirToast("Meta não encontrada", "danger");
      }
    })
    .catch(error => {
      console.error("Erro ao carregar meta:", error);
      exibirToast("Erro ao carregar meta: " + error.message, "danger");
    });
}

/**
 * Confirma a exclusão de uma meta
 * @param {string} metaId - ID da meta a ser excluída
 */
function confirmarExclusaoMeta(metaId) {
  if (confirm("Tem certeza que deseja excluir esta meta?")) {
    excluirMeta(metaId)
      .then(() => {
        exibirToast("Meta excluída com sucesso!", "success");
        renderizarPainelMetas();
      })
      .catch(error => {
        console.error("Erro ao excluir meta:", error);
        exibirToast("Erro ao excluir meta: " + error.message, "danger");
      });
  }
}

/**
 * Salva os dados de uma meta a partir do formulário
 */
function salvarMetaFormulario() {
  const metaId = document.getElementById("metaId").value;
  const titulo = document.getElementById("metaTitulo").value;
  const descricao = document.getElementById("metaDescricao").value;
  const valor = document.getElementById("metaValor").value;
  const valorAtual = document.getElementById("metaValorAtual").value;
  const dataAlvo = document.getElementById("metaDataAlvo").value;
  const categoria = document.getElementById("metaCategoria").value;
  
  // Validar dados
  if (!titulo || !valor || !dataAlvo) {
    exibirToast("Preencha todos os campos obrigatórios", "warning");
    return;
  }
  
  // Criar objeto da meta
  const meta = {
    id: metaId || null,
    titulo,
    descricao,
    valor: parseFloat(valor),
    valorAtual: parseFloat(valorAtual || 0),
    dataAlvo,
    categoria
  };
  
  // Salvar meta
  salvarMeta(meta)
    .then(() => {
      exibirToast("Meta salva com sucesso!", "success");
      fecharModal("novametaModal");
      renderizarPainelMetas();
    })
    .catch(error => {
      console.error("Erro ao salvar meta:", error);
      exibirToast("Erro ao salvar meta: " + error.message, "danger");
    });
}

/**
 * Atualiza o progresso de uma meta a partir do formulário
 */
function atualizarMetaFormulario() {
  const metaId = document.getElementById("atualizarMetaId").value;
  const valorAtual = document.getElementById("atualizarMetaValorAtual").value;
  
  // Validar dados
  if (!metaId || valorAtual === undefined) {
    exibirToast("Dados inválidos", "warning");
    return;
  }
  
  // Atualizar progresso
  atualizarProgressoMeta(metaId, parseFloat(valorAtual))
    .then(() => {
      exibirToast("Progresso atualizado com sucesso!", "success");
      fecharModal("atualizarMetaModal");
      renderizarPainelMetas();
    })
    .catch(error => {
      console.error("Erro ao atualizar progresso:", error);
      exibirToast("Erro ao atualizar progresso: " + error.message, "danger");
    });
}

// Exportar funções para uso global
window.analisarSituacaoFinanceira = analisarSituacaoFinanceira;
window.analisarGastosPorCategoria = analisarGastosPorCategoria;
window.gerarRecomendacoes = gerarRecomendacoes;
window.renderizarPainelInteligencia = renderizarPainelInteligencia;
window.renderizarPainelMetas = renderizarPainelMetas;
window.carregarMetas = carregarMetas;
window.salvarMeta = salvarMeta;
window.atualizarProgressoMeta = atualizarProgressoMeta;
window.excluirMeta = excluirMeta;
window.abrirModalEditarMeta = abrirModalEditarMeta;
window.abrirModalAtualizarMeta = abrirModalAtualizarMeta;
window.confirmarExclusaoMeta = confirmarExclusaoMeta;
window.salvarMetaFormulario = salvarMetaFormulario;
window.atualizarMetaFormulario = atualizarMetaFormulario;
