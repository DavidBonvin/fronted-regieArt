import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listEvents } from '@regieart/api';
import type { Event, ConvoySummaryItem, RouteResult } from '@regieart/types';
import { useConvoySummary } from '../hooks/useConvoySummary';
import { useCalculateRoute } from '../hooks/useCalculateRoute';
import { VehicleFormModal } from '../components/VehicleFormModal';
import { openGPSNavigation } from '../../../shared/utils/openGPSNavigation';
import s from './ConvoyPage.module.scss';
import { useActiveOrganizationId } from '../../../shared/utils/useActiveOrganizationId';

// ─── VehicleRouteCard ─────────────────────────────────────────────────────────

function VehicleRouteCard({
  vehicle, eventId, eventStartTime, onRouteCalculated,
}: {
  vehicle: ConvoySummaryItem;
  eventId: string;
  eventStartTime: string;
  onRouteCalculated: () => void;
}) {
  const { calculate, isLoading, error, errorStatus } = useCalculateRoute(
    eventId,
    vehicle.vehicleId,
    onRouteCalculated,
  );
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [navOpen, setNavOpen] = useState(false);

  async function handleCalculate() {
    try {
      const result = await calculate();
      setRouteResult(result);
    } catch { /* error displayed via hook state */ }
  }

  const departure = vehicle.suggestedDepartureAt
    ? new Date(vehicle.suggestedDepartureAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : null;
  const arrival = new Date(eventStartTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const distance = routeResult?.totalDistanceKm ?? vehicle.routeDistanceKm;
  const duration = routeResult?.totalDurationMin ?? vehicle.routeDurationMin;

  function formatDuration(minutes: number | null) {
    if (minutes == null) return null;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return hours > 0 ? `${hours} h ${remainingMinutes} min` : `${remainingMinutes} min`;
  }

  const venueCoords =
    routeResult?.venueLat != null && routeResult.venueLng != null
      ? { lat: routeResult.venueLat, lng: routeResult.venueLng }
      : null;

  return (
    <div className={`${s.vehicleCard} ${vehicle.routeCalculated ? s.vehicleCardReady : ''}`}>
      <div className={s.vehicleCardHeader}>
        <div className={s.vehicleName}>
          <span className={s.vehicleIcon}>🚐</span>
          <span>{vehicle.name}</span>
          {vehicle.routeCalculated
            ? <span className={s.badgeReady}>🟢 Route prête</span>
            : <span className={s.badgePending}>⚠️ Sans itinéraire</span>
          }
          {routeResult?.cached && <span className={s.badgeCache}>⚡ Cache Redis</span>}
        </div>
        {vehicle.driverName && (
          <span className={s.driverLabel}>Chauffeur : <strong>{vehicle.driverName}</strong></span>
        )}
      </div>

      <div className={s.vehicleStats}>
        <span className={s.stat}>👥 {vehicle.passengersCount} passagers</span>
        {vehicle.originAddress && (
          <span className={s.statRoute}>
            {vehicle.originAddress} <span className={s.routeArrow}>→</span> Venue
          </span>
        )}
      </div>

      {vehicle.routeCalculated ? (
        /* ── STATE D: Route calculée ── */
        <div className={s.routeDetails}>
          <div className={s.routeMetrics}>
            {distance != null && (
              <div className={s.metric}>
                <span className={s.metricVal}>{distance} km</span>
                <span className={s.metricLabel}>Distance</span>
              </div>
            )}
            {duration != null && (
              <div className={s.metric}>
                <span className={s.metricVal}>{formatDuration(duration)}</span>
                <span className={s.metricLabel}>Durée estimée</span>
              </div>
            )}
            <div className={s.metric}>
              <span className={s.metricVal}>{arrival}</span>
              <span className={s.metricLabel}>Arrivée requise</span>
            </div>
            {departure && (
              <div className={s.metric}>
                <span className={s.metricVal}>{departure}</span>
                <span className={s.metricLabel}>Départ suggéré</span>
              </div>
            )}
          </div>

          {departure && (
            <div className={s.departureCallout}>
              <span className={s.departureCalloutIcon}>⏱</span>
              <span><strong>Partez à {departure}</strong><small>pour arriver à l’heure à {arrival}. Le calcul inclut la durée estimée du trajet.</small></span>
            </div>
          )}

          {routeResult && routeResult.legs.length > 0 && (
            <div className={s.legs}>
              <div className={s.legsTitle}>Étapes et ramassages</div>
              {routeResult.legs.map((leg, i) => (
                <div key={i} className={s.leg}>
                  <span className={s.legIdx}>{i + 1}</span>
                  <span className={s.legFrom}>{leg.from}</span>
                  <span className={s.legDist}>{leg.distanceKm} km · {leg.durationMin} min</span>
                </div>
              ))}
            </div>
          )}

          <div className={s.vehicleActions}>
            {venueCoords && (
              <div className={s.navGroup}>
                <button className={s.btnNav} onClick={() => setNavOpen((v) => !v)}>
                  🧭 Lancer la Navigation
                </button>
                {navOpen && (
                  <div className={s.navOptions}>
                    <button
                      className={s.navOption}
                      onClick={() => { openGPSNavigation(venueCoords.lat, venueCoords.lng, 'google'); setNavOpen(false); }}
                    >
                      🗺️ Google Maps
                    </button>
                    <button
                      className={s.navOption}
                      onClick={() => { openGPSNavigation(venueCoords.lat, venueCoords.lng, 'waze'); setNavOpen(false); }}
                    >
                      🏎️ Waze GPS
                    </button>
                  </div>
                )}
              </div>
            )}
            <button className={s.btnRecalc} onClick={handleCalculate} disabled={isLoading}>
              {isLoading ? '⏳ Calcul en cours…' : '🔄 Recalculer l’itinéraire'}
            </button>
            <button className={s.btnWarn}>⚠️ Signaler un Retard</button>
          </div>
        </div>
      ) : (
        /* ── STATE C: Route non calculée ── */
        <div className={s.noRouteBox}>
          {errorStatus === 400 ? (
            <div className={s.errorBanner}>
              ⚠️ Le lieu du concert n’a pas de coordonnées GPS configurées. Modifiez l’événement pour activer le calcul d’itinéraire.
            </div>
          ) : errorStatus === 503 ? (
            <div className={s.errorBanner}>
              🔌 Service d’itinéraires OSRM temporairement indisponible.{' '}
              <button className={s.retryLink} onClick={handleCalculate}>Réessayer</button>
            </div>
          ) : error ? (
            <div className={s.errorBanner}>{error}</div>
          ) : (
            <p className={s.noRouteText}>
              La route n'a pas encore été calculée. Les temps de trajet, la distance exacte
              et l'heure de départ suggérée ne sont pas disponibles.
            </p>
          )}
          {!errorStatus && (
            <button
              className={`${s.btnCalculate} ${isLoading ? s.btnCalculateLoading : ''}`}
              onClick={handleCalculate}
              disabled={isLoading}
            >
              {isLoading
                ? <><span className={s.dotSpinner} /> Calcul de l’itinéraire…</>
                : '📍 Calculer l’itinéraire et le départ suggéré'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── EventConvoyCard ──────────────────────────────────────────────────────────

function EventConvoyCard({ event }: { event: Event }) {
  const { vehicles, isLoading, error, refetch } = useConvoySummary(event.id);
  const [showModal, setShowModal] = useState(false);

  const dateStr = new Date(event.startTime).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const hasVehicles = vehicles.length > 0;

  return (
    <div className={`${s.eventCard} ${hasVehicles ? s.eventCardActive : ''}`}>
      <div className={s.eventCardHeader}>
        <div className={s.eventInfo}>
          <span className={s.eventType}>{event.type.replace('_', ' ')}</span>
          <h2 className={s.eventTitle}>{event.title}</h2>
          <span className={s.eventDate}>{dateStr}</span>
        </div>
        <div className={hasVehicles ? s.statusBadgeGreen : s.statusBadgeOrange}>
          {hasVehicles
            ? `🟢 ${vehicles.length} véhicule${vehicles.length > 1 ? 's' : ''} configuré${vehicles.length > 1 ? 's' : ''}`
            : '⚠️ Aucun convoi associé à cet événement'}
        </div>
      </div>

      {isLoading ? (
        <div className={s.loadingRow}>
          <span className={s.dotSpinner} /> Chargement du convoi…
        </div>
      ) : error ? (
        <div className={s.errorBox}>
          {error}{' '}
          <button className={s.retryLink} onClick={refetch}>Recharger</button>
        </div>
      ) : !hasVehicles ? (
        /* ── STATE A ── */
        <div className={s.noConvoyBox}>
          <span className={s.noConvoyIcon}>🚐</span>
          <p className={s.noConvoyText}>
            Organisez le transport des musiciens, du matériel et calculez les temps de trajet OSRM.
          </p>
          <div className={s.noConvoyActions}>
            <button className={s.btnCreate} onClick={() => setShowModal(true)}>
              ➕ Créer & Attacher un Convoi
            </button>
          </div>
        </div>
      ) : (
        /* ── STATE C / D per vehicle ── */
        <div className={s.vehicleList}>
          {vehicles.map((v) => (
            <VehicleRouteCard
              key={v.vehicleId}
              vehicle={v}
              eventId={event.id}
              eventStartTime={event.startTime}
              onRouteCalculated={refetch}
            />
          ))}
          <button className={s.btnAddMore} onClick={() => setShowModal(true)}>
            ➕ Ajouter un véhicule
          </button>
        </div>
      )}

      {showModal && (
        <VehicleFormModal
          eventId={event.id}
          eventTitle={event.title}
          eventStartTime={event.startTime}
          onCreated={() => { refetch(); setShowModal(false); }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

// ─── ConvoyPage ───────────────────────────────────────────────────────────────

export function ConvoyPage() {
  const navigate = useNavigate();
  const activeOrgId = useActiveOrganizationId();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const orgId = activeOrgId ?? undefined;
    const from = new Date().toISOString().slice(0, 10);
    listEvents({ orgId, from, limit: 20 })
      .then((res) => setEvents(res.events))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeOrgId]);

  return (
    <div className={s.root}>
      <button className={s.backLink} onClick={() => navigate(-1)}>
        ← Retour
      </button>
      <header className={s.pageHeader}>
        <h1 className={s.pageTitle}>Convoi</h1>
        <p className={s.pageSubtitle}>
          Gérez les véhicules, les itinéraires et les départs de l'ensemble de vos événements
        </p>
      </header>

      {loading ? (
        <div className={s.loadingPage}>
          <div className={s.spinner} />
          <span>Chargement des événements…</span>
        </div>
      ) : events.length === 0 ? (
        <div className={s.emptyPage}>
          <div className={s.emptyIcon}>🎪</div>
          <div className={s.emptyTitle}>Aucun événement à venir</div>
          <div className={s.emptyBody}>
            Créez d'abord un événement depuis le Dashboard pour configurer la logistique.
          </div>
        </div>
      ) : (
        <div className={s.eventList}>
          {events.map((ev) => (
            <EventConvoyCard key={ev.id} event={ev} />
          ))}
        </div>
      )}
    </div>
  );
}
