import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  AlertCircle, 
  X, 
  UtensilsCrossed, 
  Eye, 
  EyeOff,
  FolderPlus,
  ShoppingBag,
  RefreshCw
} from 'lucide-react';
import { Business, Category, Product } from '../../types';
import { supabaseService } from '../../services/supabaseService';

interface ProductsViewProps {
  business: Business | null;
  categories: Category[];
  products: Product[];
  onRefreshData?: () => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  business,
  categories: initialCategories,
  products: initialProducts,
  onRefreshData
}) => {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Form states for Product
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodCategory, setProdCategory] = useState<string>('');
  const [prodDescription, setProdDescription] = useState('');
  const [prodActive, setProdActive] = useState(true);
  const [prodOrder, setProdOrder] = useState<number>(1);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form states for Category
  const [catName, setCatName] = useState('');
  const [catOrder, setCatOrder] = useState<number>(1);
  const [catActive, setCatActive] = useState(true);
  const [catError, setCatError] = useState<string | null>(null);

  // In-app Delete Confirmation Modal state (avoids window.confirm which is blocked in iframes)
  const [itemToDelete, setItemToDelete] = useState<{
    type: 'product' | 'category';
    id: string;
    name: string;
    count?: number;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const businessId = business?.id || 'printfood-main-001';

  // Load latest data
  const loadData = async () => {
    setIsRefreshing(true);
    try {
      const [cats, prods] = await Promise.all([
        supabaseService.getCategories(businessId, true),
        supabaseService.getProducts(businessId, true)
      ]);
      setCategories(cats);
      setProducts(prods);
      if (onRefreshData) onRefreshData();
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    setCategories(initialCategories);
    setProducts(initialProducts);
  }, [initialCategories, initialProducts]);

  useEffect(() => {
    const handleProductsUpdated = () => loadData();
    const handleCategoriesUpdated = () => loadData();

    window.addEventListener('printfood:products-updated', handleProductsUpdated);
    window.addEventListener('printfood:categories-updated', handleCategoriesUpdated);

    return () => {
      window.removeEventListener('printfood:products-updated', handleProductsUpdated);
      window.removeEventListener('printfood:categories-updated', handleCategoriesUpdated);
    };
  }, [businessId]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCategory = selectedCategory === 'all' || p.category_id === selectedCategory;
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchStatus = statusFilter === 'all' 
        ? true 
        : statusFilter === 'active' ? p.active : !p.active;

      return matchCategory && matchSearch && matchStatus;
    });
  }, [products, selectedCategory, searchQuery, statusFilter]);

  // Handlers for Product Modal
  const handleOpenNewProduct = () => {
    setEditingProduct(null);
    setProdName('');
    setProdPrice('');
    setProdCategory(selectedCategory !== 'all' ? selectedCategory : (categories[0]?.id || ''));
    setProdDescription('');
    setProdActive(true);
    setProdOrder(products.length + 1);
    setFormError(null);
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setProdName(prod.name);
    setProdPrice(prod.price.toString());
    setProdCategory(prod.category_id || '');
    setProdDescription(prod.description || '');
    setProdActive(prod.active);
    setProdOrder(prod.display_order);
    setFormError(null);
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim()) {
      setFormError('Informe o nome do produto.');
      return;
    }

    const priceNum = parseFloat(prodPrice.replace(',', '.'));
    if (isNaN(priceNum) || priceNum < 0) {
      setFormError('Informe um valor de venda válido.');
      return;
    }

    setIsSaving(true);
    try {
      await supabaseService.saveProduct({
        id: editingProduct?.id,
        business_id: businessId,
        category_id: prodCategory || null,
        name: prodName.trim(),
        price: priceNum,
        description: prodDescription.trim() || null,
        active: prodActive,
        display_order: prodOrder
      });

      setIsProductModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err?.message || 'Erro ao salvar produto.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestDeleteProduct = (prod: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setItemToDelete({
      type: 'product',
      id: prod.id,
      name: prod.name
    });
  };

  const handleRequestDeleteCategory = (cat: Category, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const prodsInCat = products.filter(p => p.category_id === cat.id);
    setItemToDelete({
      type: 'category',
      id: cat.id,
      name: cat.name,
      count: prodsInCat.length
    });
  };

  const handleExecuteDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      if (itemToDelete.type === 'product') {
        setProducts(prev => prev.filter(p => p.id !== itemToDelete.id));
        await supabaseService.deleteProduct(itemToDelete.id);
      } else {
        setCategories(prev => prev.filter(c => c.id !== itemToDelete.id));
        setProducts(prev => prev.map(p => p.category_id === itemToDelete.id ? { ...p, category_id: null } : p));
        if (selectedCategory === itemToDelete.id) {
          setSelectedCategory('all');
        }
        await supabaseService.deleteCategory(itemToDelete.id);
      }
      setItemToDelete(null);
      await loadData();
    } catch (err) {
      console.error('Erro ao excluir item:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleProductActive = async (prod: Product) => {
    await supabaseService.toggleProductActive(prod.id, !prod.active);
    await loadData();
  };

  // Handlers for Category Modal
  const handleOpenNewCategory = () => {
    setEditingCategory(null);
    setCatName('');
    setCatOrder(categories.length + 1);
    setCatActive(true);
    setCatError(null);
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatOrder(cat.display_order);
    setCatActive(cat.active);
    setCatError(null);
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      setCatError('Informe o nome da categoria.');
      return;
    }

    setIsSaving(true);
    try {
      await supabaseService.saveCategory({
        id: editingCategory?.id,
        business_id: businessId,
        name: catName.trim(),
        display_order: catOrder,
        active: catActive
      });

      setCatName('');
      setEditingCategory(null);
      await loadData();
    } catch (err: any) {
      setCatError(err?.message || 'Erro ao salvar categoria.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatMoney = (val: number) => `R$ ${val.toFixed(2).replace('.', ',')}`;

  const activeProductsCount = products.filter(p => p.active).length;

  return (
    <div className="flex-1 p-4 md:p-6 overflow-y-auto bg-neutral-950">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-sm">
          <div>
            <div className="flex items-center gap-2.5 text-orange-500 mb-1">
              <UtensilsCrossed className="w-6 h-6" />
              <span className="text-xs font-black uppercase tracking-wider">Gestão de Cardápio</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white">Produtos & Cardápio</h1>
            <p className="text-neutral-400 text-sm mt-1">
              Cadastre novos itens, reajuste preços, pause produtos esgotados e organize categorias do PDV.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={loadData}
              disabled={isRefreshing}
              className="p-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-2xl font-bold text-sm transition"
              title="Atualizar lista de produtos"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-orange-400' : ''}`} />
            </button>

            <button
              type="button"
              onClick={handleOpenNewCategory}
              className="flex items-center gap-2 px-4 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-2xl font-bold text-sm transition"
            >
              <FolderPlus className="w-4 h-4 text-orange-400" />
              <span>Categorias</span>
            </button>

            <button
              type="button"
              onClick={handleOpenNewProduct}
              className="flex items-center gap-2 px-5 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-black text-sm transition shadow-lg shadow-orange-950/40"
            >
              <Plus className="w-5 h-5" />
              <span>Novo Produto</span>
            </button>
          </div>
        </div>

        {/* STATS STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-neutral-900/90 border border-neutral-800/80 rounded-2xl p-4">
            <div className="text-xs font-bold text-neutral-400">Total de Produtos</div>
            <div className="text-2xl font-black text-white mt-0.5">{products.length}</div>
          </div>
          <div className="bg-neutral-900/90 border border-neutral-800/80 rounded-2xl p-4">
            <div className="text-xs font-bold text-emerald-400">Ativos no PDV</div>
            <div className="text-2xl font-black text-emerald-400 mt-0.5">{activeProductsCount}</div>
          </div>
          <div className="bg-neutral-900/90 border border-neutral-800/80 rounded-2xl p-4">
            <div className="text-xs font-bold text-amber-400">Pausados / Esgotados</div>
            <div className="text-2xl font-black text-amber-400 mt-0.5">{products.length - activeProductsCount}</div>
          </div>
          <div className="bg-neutral-900/90 border border-neutral-800/80 rounded-2xl p-4">
            <div className="text-xs font-bold text-sky-400">Categorias Criadas</div>
            <div className="text-2xl font-black text-sky-400 mt-0.5">{categories.length}</div>
          </div>
        </div>

        {/* SEARCH & FILTERS BAR */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-4 md:p-5 space-y-4 shadow-sm">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                placeholder="Buscar produto pelo nome ou descrição..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl pl-11 pr-4 py-2.5 text-white placeholder:text-neutral-500 focus:outline-none focus:border-orange-500 text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-neutral-950 border border-neutral-800 rounded-2xl p-1 shrink-0">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  statusFilter === 'all'
                    ? 'bg-neutral-800 text-white'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Todos ({products.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  statusFilter === 'active'
                    ? 'bg-emerald-600 text-white'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Ativos ({activeProductsCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('inactive')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  statusFilter === 'inactive'
                    ? 'bg-amber-600 text-white'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Pausados ({products.length - activeProductsCount})
              </button>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar pt-1 border-t border-neutral-800/60">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-2 shrink-0 ${
                selectedCategory === 'all'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'bg-neutral-950 text-neutral-400 hover:bg-neutral-800 hover:text-white border border-neutral-800'
              }`}
            >
              <span>Todos</span>
              <span className="px-1.5 py-0.5 rounded-md bg-neutral-900/60 text-[10px] text-white">
                {products.length}
              </span>
            </button>

            {categories.map(cat => {
              const count = products.filter(p => p.category_id === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-2 shrink-0 ${
                    selectedCategory === cat.id
                      ? 'bg-orange-600 text-white shadow-md'
                      : 'bg-neutral-950 text-neutral-400 hover:bg-neutral-800 hover:text-white border border-neutral-800'
                  }`}
                >
                  <span>{cat.name}</span>
                  <span className="px-1.5 py-0.5 rounded-md bg-neutral-900/60 text-[10px] text-white">
                    {count}
                  </span>
                </button>
              );
            })}

            <button
              onClick={handleOpenNewCategory}
              className="px-3 py-2 rounded-xl text-xs font-bold text-neutral-400 hover:text-orange-400 hover:bg-neutral-950 border border-dashed border-neutral-800 whitespace-nowrap flex items-center gap-1.5 shrink-0 transition"
              title="Adicionar ou gerenciar categorias"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Gerenciar Categorias</span>
            </button>
          </div>
        </div>

        {/* PRODUCTS GRID */}
        {filteredProducts.length === 0 ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-12 text-center">
            <ShoppingBag className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
            <h3 className="text-lg font-black text-white">Nenhum produto encontrado</h3>
            <p className="text-neutral-400 text-sm mt-1 max-w-md mx-auto">
              {searchQuery
                ? `Nenhum resultado para a busca "${searchQuery}".`
                : 'Você ainda não cadastrou produtos nesta categoria.'}
            </p>
            <button
              type="button"
              onClick={handleOpenNewProduct}
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-bold transition"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Primeiro Produto</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map(prod => {
              const cat = categories.find(c => c.id === prod.category_id);
              return (
                <div
                  key={prod.id}
                  className={`bg-neutral-900 border rounded-3xl p-5 flex flex-col justify-between transition-all duration-200 group ${
                    prod.active 
                      ? 'border-neutral-800 hover:border-neutral-700 shadow-sm' 
                      : 'border-neutral-800/60 opacity-60 bg-neutral-900/60'
                  }`}
                >
                  {/* Top: Category & Status */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2.5 py-1 rounded-lg bg-neutral-800 text-neutral-300 text-[11px] font-bold tracking-wide uppercase truncate max-w-[150px]">
                        {cat ? cat.name : 'Sem Categoria'}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleToggleProductActive(prod)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-black flex items-center gap-1 transition ${
                          prod.active 
                            ? 'bg-emerald-950/80 text-emerald-400 hover:bg-emerald-900' 
                            : 'bg-amber-950/80 text-amber-400 hover:bg-amber-900'
                        }`}
                        title={prod.active ? 'Clique para pausar no PDV' : 'Clique para ativar no PDV'}
                      >
                        {prod.active ? (
                          <>
                            <Eye className="w-3 h-3" />
                            <span>No PDV</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3" />
                            <span>Pausado</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Name */}
                    <h3 className="text-base font-black text-white line-clamp-2 leading-snug">
                      {prod.name}
                    </h3>

                    {/* Description */}
                    {prod.description && (
                      <p className="text-xs text-neutral-400 mt-1 line-clamp-2">
                        {prod.description}
                      </p>
                    )}
                  </div>

                  {/* Bottom: Price & Action Buttons */}
                  <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-neutral-500 block">Preço de Venda</span>
                      <span className="text-xl font-black text-orange-400">
                        {formatMoney(prod.price)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditProduct(prod)}
                        className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition"
                        title="Editar produto"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleRequestDeleteProduct(prod, e)}
                        className="p-2 rounded-xl bg-neutral-800 hover:bg-red-950 hover:text-red-400 text-neutral-400 transition"
                        title="Excluir produto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* ======================================================== */}
      {/* MODAL: NOVO / EDITAR PRODUTO                             */}
      {/* ======================================================== */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-white">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2.5 text-orange-500">
                <UtensilsCrossed className="w-5 h-5" />
                <h3 className="text-lg font-black text-white">
                  {editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error banner */}
            {formError && (
              <div className="p-3 bg-red-950/60 border border-red-800 rounded-2xl flex items-center gap-2 text-xs text-red-300 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSaveProduct} className="space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                  Nome do Produto *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Chopp Artesanal 500ml, X-Salada, Pastel de Carne..."
                  value={prodName}
                  onChange={e => setProdName(e.target.value)}
                  required
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-white placeholder:text-neutral-600 focus:outline-none focus:border-orange-500 text-sm font-medium"
                />
              </div>

              {/* Preço e Categoria */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                    Preço de Venda (R$) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-bold text-sm">
                      R$
                    </span>
                    <input
                      type="text"
                      placeholder="0,00"
                      value={prodPrice}
                      onChange={e => setProdPrice(e.target.value)}
                      required
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-3.5 py-2.5 text-white placeholder:text-neutral-600 focus:outline-none focus:border-orange-500 text-sm font-black"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                    Categoria
                  </label>
                  <select
                    value={prodCategory}
                    onChange={e => setProdCategory(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-orange-500 text-sm font-medium"
                  >
                    <option value="">Sem Categoria</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Descrição / Ingredientes */}
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                  Descrição / Ingredientes (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Copo descartável com colarinho / Hambúrguer 160g, queijo e maionese da casa"
                  value={prodDescription}
                  onChange={e => setProdDescription(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-white placeholder:text-neutral-600 focus:outline-none focus:border-orange-500 text-xs resize-none"
                />
              </div>

              {/* Ordem e Switch Ativo */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                    Ordem de Exibição
                  </label>
                  <input
                    type="number"
                    value={prodOrder}
                    onChange={e => setProdOrder(parseInt(e.target.value) || 1)}
                    min={1}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-white text-sm"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5">
                    <input
                      type="checkbox"
                      checked={prodActive}
                      onChange={e => setProdActive(e.target.checked)}
                      className="w-4 h-4 accent-orange-600 rounded cursor-pointer"
                    />
                    <span className="text-xs font-bold text-neutral-200">
                      Disponível no PDV
                    </span>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 flex gap-2 border-t border-neutral-800">
                {editingProduct && (
                  <button
                    type="button"
                    onClick={() => {
                      const prodToDel = editingProduct;
                      setIsProductModalOpen(false);
                      handleRequestDeleteProduct(prodToDel);
                    }}
                    className="py-3 px-3.5 bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 text-red-300 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5"
                    title="Excluir este produto"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    <span>Excluir</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl font-bold text-xs transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-black text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-orange-950/60"
                >
                  {isSaving ? 'Salvando...' : editingProduct ? 'Salvar Alterações' : 'Cadastrar Produto'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: GERENCIAR CATEGORIAS                              */}
      {/* ======================================================== */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-white">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2 text-orange-400 font-black">
                <FolderPlus className="w-5 h-5" />
                <span className="text-lg text-white">Categorias do Cardápio</span>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error */}
            {catError && (
              <div className="p-3 bg-red-950/60 border border-red-800 rounded-2xl text-xs text-red-300 font-bold">
                {catError}
              </div>
            )}

            {/* Add / Edit Form */}
            <form onSubmit={handleSaveCategory} className="bg-neutral-950 border border-neutral-800 rounded-2xl p-3.5 space-y-3">
              <div className="text-xs font-black text-orange-400 uppercase">
                {editingCategory ? `Editando: ${editingCategory.name}` : '+ Nova Categoria'}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <input
                    type="text"
                    placeholder="Nome da categoria..."
                    value={catName}
                    onChange={e => setCatName(e.target.value)}
                    required
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-white text-xs placeholder:text-neutral-600 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    placeholder="Ordem"
                    value={catOrder}
                    onChange={e => setCatOrder(parseInt(e.target.value) || 1)}
                    min={1}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                {editingCategory && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCategory(null);
                      setCatName('');
                    }}
                    className="py-2 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-bold transition"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-black transition"
                >
                  {isSaving ? 'Salvando...' : editingCategory ? 'Atualizar Categoria' : 'Adicionar Categoria'}
                </button>
              </div>
            </form>

            {/* Existing Categories List */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                Categorias Existentes ({categories.length})
              </div>

              {categories.map(cat => {
                const count = products.filter(p => p.category_id === cat.id).length;
                return (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-3 bg-neutral-950/80 border border-neutral-800 rounded-2xl text-sm"
                  >
                    <div>
                      <div className="font-bold text-white flex items-center gap-2">
                        <span>{cat.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">
                          {count} produto(s)
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-500">
                        Ordem no PDV: {cat.display_order}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEditCategory(cat)}
                        className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleRequestDeleteCategory(cat, e)}
                        className="p-1.5 rounded-lg bg-neutral-800 hover:bg-red-950 hover:text-red-400 text-neutral-400 transition"
                        title="Excluir categoria"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-bold transition"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CONFIRMAÇÃO DE EXCLUSÃO (100% SEGURO EM IFRAME)   */}
      {/* ======================================================== */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-white animate-in zoom-in-95">
            
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">
                  Excluir {itemToDelete.type === 'product' ? 'Produto' : 'Categoria'}?
                </h3>
                <p className="text-xs text-neutral-400">Esta ação removerá o item do sistema.</p>
              </div>
            </div>

            <div className="p-4 bg-neutral-950/80 border border-neutral-800/80 rounded-2xl space-y-2">
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span className="text-neutral-400 font-normal">Item:</span>
                <span className="text-orange-400 font-black">{itemToDelete.name}</span>
              </div>

              {itemToDelete.type === 'category' && (itemToDelete.count ?? 0) > 0 && (
                <div className="flex items-start gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Existem <strong>{itemToDelete.count} produto(s)</strong> nesta categoria. Ao excluí-la, esses itens ficarão sem categoria no cardápio, mas não serão apagados.
                  </span>
                </div>
              )}

              {itemToDelete.type === 'product' && (
                <p className="text-xs text-neutral-400">
                  O produto será removido imediatamente e não aparecerá mais para venda no PDV ou terminais móveis.
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-sm font-bold transition"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleExecuteDelete}
                disabled={isDeleting}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-black transition flex items-center justify-center gap-2 shadow-lg shadow-red-950/50"
              >
                {isDeleting ? (
                  <span>Excluindo...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Sim, Excluir</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
