import { firstValueFrom } from 'rxjs';
import { MantenimientosService } from './mantenimientos.service';
import { StorageCacheService } from './storage-cache.service';
import { SupabaseService } from './supabase.service';

describe('Persistencia de movimientos Kanban', () => {
  it('actualiza solo el estado de la solicitud e invalida la caché después de confirmar', async () => {
    const fila = { id: 11, estado: 6 };
    const single = jasmine.createSpy('single').and.resolveTo({ data: fila, error: null });
    const select = jasmine.createSpy('select').and.returnValue({ single });
    const eq = jasmine.createSpy('eq').and.returnValue({ select });
    const update = jasmine.createSpy('update').and.returnValue({ eq });
    const from = jasmine.createSpy('from').and.returnValue({ update });
    const cache = jasmine.createSpyObj('StorageCacheService', ['invalidate']);
    const service = new MantenimientosService({ client: { from } } as unknown as SupabaseService,
      cache as StorageCacheService);
    const resultado = await firstValueFrom(service.cambiarEstado(11, 6));
    expect(from).toHaveBeenCalledWith('mantenimientos');
    expect(update).toHaveBeenCalledOnceWith({ estado: 6 });
    expect(eq).toHaveBeenCalledWith('id', 11);
    expect(single).toHaveBeenCalled();
    expect(resultado.data).toEqual(jasmine.objectContaining(fila));
    expect(cache.invalidate).toHaveBeenCalledWith('angular1:mantenimientos');

    single.and.resolveTo({ data: null, error: { message: 'Sin permiso' } });
    cache.invalidate.calls.reset();
    await expectAsync(firstValueFrom(service.cambiarEstado(11, 7))).toBeRejected();
    expect(cache.invalidate).not.toHaveBeenCalled();
  });
});
