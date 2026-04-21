/**
 * Sistema de Upload de Fotos - SAMS CRM ERP
 * Versão: 1.0
 * Funcionalidades: Upload, compressão, organização e gerenciamento de fotos
 */

class PhotoUploadSystem {
    constructor() {
        this.version = '1.0';
        this.debug = true;
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        this.allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        this.compressionQuality = 0.8;
        this.maxWidth = 1920;
        this.maxHeight = 1080;
        this.photos = this.loadPhotos();
        this.init();
    }

    init() {
        this.createUploadInterface();
        this.bindEvents();
        this.log('Sistema de Upload de Fotos inicializado');
    }

    log(message) {
        if (this.debug) {
            console.log(`[PhotoUpload] ${message}`);
        }
    }

    // Criar interface de upload
    createUploadInterface() {
        const style = document.createElement('style');
        style.textContent = `
            .photo-upload-container {
                border: 2px dashed #cbd5e0;
                border-radius: 8px;
                padding: 2rem;
                text-align: center;
                transition: all 0.3s ease;
                background: #f7fafc;
            }
            
            .photo-upload-container:hover,
            .photo-upload-container.dragover {
                border-color: #4299e1;
                background: #ebf8ff;
            }
            
            .photo-preview {
                position: relative;
                display: inline-block;
                margin: 0.5rem;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            
            .photo-preview img {
                width: 150px;
                height: 150px;
                object-fit: cover;
            }
            
            .photo-preview .photo-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            
            .photo-preview:hover .photo-overlay {
                opacity: 1;
            }
            
            .photo-actions {
                display: flex;
                gap: 0.5rem;
            }
            
            .photo-actions button {
                padding: 0.5rem;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.875rem;
                transition: all 0.2s ease;
            }
            
            .photo-metadata {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                background: linear-gradient(transparent, rgba(0,0,0,0.8));
                color: white;
                padding: 1rem 0.5rem 0.5rem;
                font-size: 0.75rem;
            }
            
            .upload-progress {
                width: 100%;
                height: 4px;
                background: #e2e8f0;
                border-radius: 2px;
                overflow: hidden;
                margin-top: 1rem;
            }
            
            .upload-progress-bar {
                height: 100%;
                background: #4299e1;
                transition: width 0.3s ease;
            }
        `;
        document.head.appendChild(style);
    }

    // Upload de foto
    async uploadPhoto(file, metadata = {}) {
        try {
            // Validar arquivo
            if (!this.validateFile(file)) {
                throw new Error('Arquivo inválido');
            }

            // Comprimir imagem
            const compressedFile = await this.compressImage(file);
            
            // Criar objeto da foto
            const photo = {
                id: this.generateId(),
                name: file.name,
                originalName: file.name,
                size: compressedFile.size,
                type: file.type,
                uploadDate: new Date().toISOString(),
                checklistId: metadata.checklistId || null,
                inspectionId: metadata.inspectionId || null,
                categoria: metadata.categoria || 'geral',
                etapa: metadata.etapa || '',
                descricao: metadata.descricao || '',
                tags: metadata.tags || [],
                coordenadas: metadata.coordenadas || null,
                dataUrl: compressedFile.dataUrl,
                thumbnail: await this.generateThumbnail(compressedFile.dataUrl),
                metadata: {
                    width: compressedFile.width,
                    height: compressedFile.height,
                    originalSize: file.size,
                    compressedSize: compressedFile.size,
                    compressionRatio: Math.round((1 - compressedFile.size / file.size) * 100)
                }
            };

            // Salvar foto
            this.photos.push(photo);
            this.savePhotos();
            
            this.log(`Foto carregada: ${photo.name} (${this.formatFileSize(photo.size)})`);
            return photo;

        } catch (error) {
            this.log(`Erro no upload: ${error.message}`);
            throw error;
        }
    }

    // Validar arquivo
    validateFile(file) {
        if (!file) {
            alert('Nenhum arquivo selecionado');
            return false;
        }

        if (!this.allowedTypes.includes(file.type)) {
            alert('Tipo de arquivo não permitido. Use JPEG, PNG ou WebP.');
            return false;
        }

        if (file.size > this.maxFileSize) {
            alert(`Arquivo muito grande. Tamanho máximo: ${this.formatFileSize(this.maxFileSize)}`);
            return false;
        }

        return true;
    }

    // Comprimir imagem
    async compressImage(file) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                // Calcular dimensões mantendo proporção
                let { width, height } = this.calculateDimensions(img.width, img.height);
                
                canvas.width = width;
                canvas.height = height;

                // Desenhar imagem redimensionada
                ctx.drawImage(img, 0, 0, width, height);

                // Converter para blob
                canvas.toBlob((blob) => {
                    if (blob) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            resolve({
                                blob: blob,
                                size: blob.size,
                                dataUrl: e.target.result,
                                width: width,
                                height: height
                            });
                        };
                        reader.readAsDataURL(blob);
                    } else {
                        reject(new Error('Erro na compressão da imagem'));
                    }
                }, file.type, this.compressionQuality);
            };

            img.onerror = () => reject(new Error('Erro ao carregar imagem'));
            
            const reader = new FileReader();
            reader.onload = (e) => img.src = e.target.result;
            reader.readAsDataURL(file);
        });
    }

    // Calcular dimensões mantendo proporção
    calculateDimensions(originalWidth, originalHeight) {
        let width = originalWidth;
        let height = originalHeight;

        if (width > this.maxWidth) {
            height = (height * this.maxWidth) / width;
            width = this.maxWidth;
        }

        if (height > this.maxHeight) {
            width = (width * this.maxHeight) / height;
            height = this.maxHeight;
        }

        return { width: Math.round(width), height: Math.round(height) };
    }

    // Gerar thumbnail
    async generateThumbnail(dataUrl, size = 150) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                canvas.width = size;
                canvas.height = size;

                // Calcular crop para manter proporção quadrada
                const minDim = Math.min(img.width, img.height);
                const x = (img.width - minDim) / 2;
                const y = (img.height - minDim) / 2;

                ctx.drawImage(img, x, y, minDim, minDim, 0, 0, size, size);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };

            img.src = dataUrl;
        });
    }

    // Renderizar interface de upload
    renderUploadInterface(containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const config = {
            multiple: options.multiple !== false,
            categoria: options.categoria || 'geral',
            checklistId: options.checklistId || null,
            inspectionId: options.inspectionId || null,
            showPreview: options.showPreview !== false,
            ...options
        };

        container.innerHTML = `
            <div class="photo-upload-section">
                <div class="photo-upload-container" id="upload-zone-${containerId}">
                    <div class="upload-icon mb-4">
                        <svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                        </svg>
                    </div>
                    <div class="upload-text">
                        <p class="text-lg font-medium text-gray-700 mb-2">Clique para selecionar fotos</p>
                        <p class="text-sm text-gray-500">ou arraste e solte aqui</p>
                        <p class="text-xs text-gray-400 mt-2">JPEG, PNG, WebP até ${this.formatFileSize(this.maxFileSize)}</p>
                    </div>
                    <input type="file" 
                           id="file-input-${containerId}" 
                           accept="${this.allowedTypes.join(',')}"
                           ${config.multiple ? 'multiple' : ''}
                           style="display: none;">
                </div>
                
                <div class="upload-progress" id="progress-${containerId}" style="display: none;">
                    <div class="upload-progress-bar" id="progress-bar-${containerId}"></div>
                </div>
                
                ${config.showPreview ? `
                    <div class="photo-preview-section mt-6" id="preview-${containerId}">
                        <h3 class="text-lg font-medium text-gray-800 mb-4">Fotos Carregadas</h3>
                        <div class="photo-grid" id="photo-grid-${containerId}">
                            ${this.renderPhotoGrid(config)}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        this.bindUploadEvents(containerId, config);
    }

    // Vincular eventos de upload
    bindUploadEvents(containerId, config) {
        const uploadZone = document.getElementById(`upload-zone-${containerId}`);
        const fileInput = document.getElementById(`file-input-${containerId}`);

        // Click para selecionar arquivo
        uploadZone.addEventListener('click', () => fileInput.click());

        // Drag and drop
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('dragover');
        });

        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('dragover');
        });

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
            this.handleFiles(e.dataTransfer.files, containerId, config);
        });

        // Seleção de arquivo
        fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files, containerId, config);
        });
    }

    // Processar arquivos selecionados
    async handleFiles(files, containerId, config) {
        const fileArray = Array.from(files);
        const progressBar = document.getElementById(`progress-bar-${containerId}`);
        const progressContainer = document.getElementById(`progress-${containerId}`);
        
        progressContainer.style.display = 'block';
        
        for (let i = 0; i < fileArray.length; i++) {
            const file = fileArray[i];
            const progress = ((i + 1) / fileArray.length) * 100;
            
            progressBar.style.width = `${progress}%`;
            
            try {
                const metadata = {
                    categoria: config.categoria,
                    checklistId: config.checklistId,
                    inspectionId: config.inspectionId,
                    etapa: config.etapa || '',
                    descricao: config.descricao || ''
                };
                
                await this.uploadPhoto(file, metadata);
                
                if (config.showPreview) {
                    this.updatePhotoGrid(containerId, config);
                }
                
            } catch (error) {
                console.error(`Erro no upload de ${file.name}:`, error);
            }
        }
        
        progressContainer.style.display = 'none';
        progressBar.style.width = '0%';
    }

    // Renderizar grid de fotos
    renderPhotoGrid(config) {
        const photos = this.getPhotosByFilter(config);
        
        if (photos.length === 0) {
            return '<p class="text-gray-500 text-center py-8">Nenhuma foto carregada ainda</p>';
        }

        return photos.map(photo => `
            <div class="photo-preview" data-photo-id="${photo.id}">
                <img src="${photo.thumbnail}" alt="${photo.name}" loading="lazy">
                <div class="photo-overlay">
                    <div class="photo-actions">
                        <button onclick="photoUpload.viewPhoto('${photo.id}')" 
                                class="bg-blue-600 text-white hover:bg-blue-700">
                            👁️
                        </button>
                        <button onclick="photoUpload.editPhoto('${photo.id}')" 
                                class="bg-yellow-600 text-white hover:bg-yellow-700">
                            ✏️
                        </button>
                        <button onclick="photoUpload.deletePhoto('${photo.id}')" 
                                class="bg-red-600 text-white hover:bg-red-700">
                            🗑️
                        </button>
                    </div>
                </div>
                <div class="photo-metadata">
                    <div class="font-medium">${photo.name}</div>
                    <div class="text-xs opacity-75">
                        ${this.formatFileSize(photo.size)} • ${photo.categoria}
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Atualizar grid de fotos
    updatePhotoGrid(containerId, config) {
        const grid = document.getElementById(`photo-grid-${containerId}`);
        if (grid) {
            grid.innerHTML = this.renderPhotoGrid(config);
        }
    }

    // Filtrar fotos
    getPhotosByFilter(filter) {
        return this.photos.filter(photo => {
            if (filter.checklistId && photo.checklistId !== filter.checklistId) return false;
            if (filter.inspectionId && photo.inspectionId !== filter.inspectionId) return false;
            if (filter.categoria && photo.categoria !== filter.categoria) return false;
            return true;
        });
    }

    // Visualizar foto
    viewPhoto(photoId) {
        const photo = this.getPhoto(photoId);
        if (!photo) return;

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="max-w-4xl max-h-full p-4">
                <div class="bg-white rounded-lg overflow-hidden">
                    <div class="p-4 border-b">
                        <div class="flex justify-between items-center">
                            <h3 class="text-lg font-medium">${photo.name}</h3>
                            <button onclick="this.closest('.fixed').remove()" 
                                    class="text-gray-500 hover:text-gray-700">✕</button>
                        </div>
                    </div>
                    <div class="p-4">
                        <img src="${photo.dataUrl}" alt="${photo.name}" class="max-w-full max-h-96 mx-auto">
                        <div class="mt-4 grid grid-cols-2 gap-4 text-sm">
                            <div><strong>Tamanho:</strong> ${this.formatFileSize(photo.size)}</div>
                            <div><strong>Dimensões:</strong> ${photo.metadata.width}x${photo.metadata.height}</div>
                            <div><strong>Categoria:</strong> ${photo.categoria}</div>
                            <div><strong>Upload:</strong> ${new Date(photo.uploadDate).toLocaleString()}</div>
                            <div><strong>Compressão:</strong> ${photo.metadata.compressionRatio}%</div>
                            <div><strong>Etapa:</strong> ${photo.etapa || 'N/A'}</div>
                        </div>
                        ${photo.descricao ? `<div class="mt-4"><strong>Descrição:</strong> ${photo.descricao}</div>` : ''}

                        <!-- Footer com navegação -->
                        <div class="mt-6 flex justify-end">
                            <button id="photo-view-back-dashboard" class="px-4 py-2 border border-gray-300 rounded text-gray-700 bg-gray-100 hover:bg-gray-200 transition">
                                <i class="fas fa-arrow-left mr-2"></i>Voltar ao Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Evento para Voltar ao Dashboard
        const backBtn = modal.querySelector('#photo-view-back-dashboard');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                modal.remove();
                if (window.NavigationSystem && typeof NavigationSystem.navigateToModule === 'function') {
                    NavigationSystem.navigateToModule('dashboard');
                } else {
                    try {
                        window.location.href = '/?module=dashboard';
                    } catch (e) {
                        console.warn('[PhotoUpload] Não foi possível navegar para o dashboard.', e);
                    }
                }
            });
        }
        
        document.body.appendChild(modal);
    }

    // Excluir foto
    deletePhoto(photoId) {
        if (!confirm('Tem certeza que deseja excluir esta foto?')) return;
        
        this.photos = this.photos.filter(photo => photo.id !== photoId);
        this.savePhotos();
        
        // Remover do DOM
        const photoElement = document.querySelector(`[data-photo-id="${photoId}"]`);
        if (photoElement) {
            photoElement.remove();
        }
        
        this.log(`Foto excluída: ${photoId}`);
    }

    // Métodos auxiliares
    getPhoto(id) {
        return this.photos.find(photo => photo.id === id);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    generateId() {
        return 'photo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Persistência
    loadPhotos() {
        try {
            const data = localStorage.getItem('sams_photos');
            return data ? JSON.parse(data) : [];
        } catch (error) {
            this.log('Erro ao carregar fotos: ' + error.message);
            return [];
        }
    }

    savePhotos() {
        try {
            localStorage.setItem('sams_photos', JSON.stringify(this.photos));
        } catch (error) {
            this.log('Erro ao salvar fotos: ' + error.message);
        }
    }

    bindEvents() {
        // Eventos globais se necessário
    }
}

// Inicializar sistema
const photoUpload = new PhotoUploadSystem();
window.photoUpload = photoUpload;
