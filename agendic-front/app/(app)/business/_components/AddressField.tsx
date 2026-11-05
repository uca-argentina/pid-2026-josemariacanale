'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { PanelInput } from '@/app/(app)/_components/panel-ui';
import { LocationMap } from '@/app/_components/maps/LocationMap';
import { useGoogleMaps } from '@/app/_components/maps/google-maps';
import { Combobox, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList, ComboboxPopup } from '@/app/_components/ui/combobox';
import { getTimeZoneAction } from '../branches/actions';

type Location = { lat: number; lng: number };
type Suggestion = { text: string; prediction?: google.maps.places.PlacePrediction };

/** Lo que cambió: la dirección, el punto (null mientras no se elija una sugerencia) o la zona horaria precargada. */
export type AddressChange = Partial<{ address: string; location: Location | null; timeZone: string }>;

/** Espera entre teclas antes de pedir sugerencias a Places. */
const DEBOUNCE_MS = 250;

/**
 * La Ubicación de una Sucursal: dirección con Places Autocomplete y, al elegir una sugerencia, su punto en un mapa
 * que se puede arrastrar. Escribir sin elegir deja el punto en null, y la zona horaria se precarga desde el punto.
 * Sin SDK de Google queda un input de texto y no hay mapa.
 */
export function AddressField({
    id,
    address,
    location,
    onChange,
    invalid,
}: {
    id: string;
    address: string;
    location: Location | null;
    onChange: (change: AddressChange) => void;
    /** `aria-invalid` / `aria-describedby` del error del campo, si lo hay. */
    invalid?: object;
}) {
    const maps = useGoogleMaps();
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const session = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
    useEffect(() => () => clearTimeout(timer.current), []);

    if (!maps) {
        return (
            <PanelInput
                id={id}
                placeholder="Av. Cabildo 1234"
                value={address}
                onChange={(e) => onChange({ address: e.target.value, location: null })}
                {...invalid}
            />
        );
    }

    const search = (input: string) => {
        clearTimeout(timer.current);
        if (!input.trim()) return setSuggestions([]);
        timer.current = setTimeout(async () => {
            const { AutocompleteSessionToken, AutocompleteSuggestion } = (await google.maps.importLibrary('places')) as google.maps.PlacesLibrary;
            // One session per address picked: Google bills the keystrokes and the pick as one request.
            session.current ??= new AutocompleteSessionToken();
            try {
                const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({ input, sessionToken: session.current, language: 'es' });
                setSuggestions(suggestions.flatMap((s) => (s.placePrediction ? [{ text: s.placePrediction.text.text, prediction: s.placePrediction }] : [])));
            } catch {
                setSuggestions([]);
            }
        }, DEBOUNCE_MS);
    };

    const pick = async (suggestion: Suggestion | null) => {
        if (!suggestion?.prediction) return;
        const place = suggestion.prediction.toPlace();
        await place.fetchFields({ fields: ['location'] });
        session.current = null;
        if (!place.location) return;
        const picked = { lat: place.location.lat(), lng: place.location.lng() };
        onChange({ address: suggestion.text, location: picked });
        const timeZone = await getTimeZoneAction(picked);
        if (timeZone) onChange({ timeZone });
    };

    return (
        <div className="flex flex-col gap-2">
            <Combobox<Suggestion>
                items={suggestions}
                filter={null}
                value={location ? { text: address } : null}
                onValueChange={pick}
                inputValue={address}
                onInputValueChange={(text, details) => {
                    // Only typing moves the address away from the picked one; Base UI's own resets (blur, Escape) don't.
                    if (details.reason !== 'input-change') return;
                    onChange({ address: text, location: null });
                    search(text);
                }}
                itemToStringLabel={(s) => s.text}
                isItemEqualToValue={(a, b) => a.text === b.text}
            >
                <ComboboxInput
                    id={id}
                    placeholder="Buscá la dirección"
                    showTrigger={false}
                    startAddon={<MapPin />}
                    autoComplete="off"
                    {...invalid}
                />
                <ComboboxPopup>
                    <ComboboxEmpty>Escribí la dirección y elegila de la lista.</ComboboxEmpty>
                    <ComboboxList>
                        {(s: Suggestion) => (
                            <ComboboxItem key={s.text} value={s}>
                                {s.text}
                            </ComboboxItem>
                        )}
                    </ComboboxList>
                </ComboboxPopup>
            </Combobox>
            {location && (
                <>
                    <LocationMap
                        label={`Mapa de ${address}`}
                        points={[location]}
                        onMove={(moved) => onChange({ location: moved })}
                    />
                    <p className="m-0 text-[12.5px] font-medium text-[#6b7280]">Arrastrá el punto si no quedó justo en la puerta.</p>
                </>
            )}
        </div>
    );
}
