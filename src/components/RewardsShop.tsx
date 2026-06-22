import { useState } from 'react'
import { motion } from 'framer-motion'
import { GlassCard } from './ui/GlassCard'
import { LevelCardsSkeleton } from './ui/Skeletons'
import { RewardIcon } from './RewardIcon'
import { showError, showSuccess } from '../lib/toast'
import { purchaseReward } from '../services/studentService'
import { useRewards } from '../hooks/useRewards'
import type { ShopReward } from '../types/reward'

interface RewardsShopProps {
  balance: number
}

export function RewardsShop({ balance }: RewardsShopProps) {
  const { rewards, loading } = useRewards({ activeOnly: true })
  const [purchasingId, setPurchasingId] = useState<string | null>(null)

  const handlePurchase = async (reward: ShopReward) => {
    if (balance < reward.cost || purchasingId !== null) return

    setPurchasingId(reward.id)

    try {
      await purchaseReward(reward.cost, reward.name)
      showSuccess(
        'Premio sbloccato! Mostra questa schermata al Tutor per riscuoterlo.',
      )
    } catch (error) {
      const message =
        error instanceof Error && error.message === 'Saldo insufficiente.'
          ? 'Non hai abbastanza Sesterzi per questo premio.'
          : 'Impossibile completare l\'acquisto. Riprova.'
      showError(message)
    } finally {
      setPurchasingId(null)
    }
  }

  return (
    <section className="space-y-8">
      <GlassCard className="border-amber-200/80 bg-gradient-to-br from-amber-50/90 to-white/90 !p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-700">
          Il tuo tesoro
        </p>
        <p className="mt-3 font-serif text-4xl font-bold tabular-nums text-amber-900 sm:text-5xl">
          {balance.toLocaleString('it-IT')} Sesterzi
        </p>
        <p className="mt-3 text-sm text-slate-600">
          Completa le frasi latine per guadagnare monete e sbloccare premi reali.
        </p>
      </GlassCard>

      <div>
        <h2 className="font-serif text-xl font-semibold text-slate-800 sm:text-2xl">
          Negozio Premi
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Scegli un premio e mostralo al Tutor dopo l&apos;acquisto.
        </p>
      </div>

      {loading ? (
        <LevelCardsSkeleton count={2} />
      ) : rewards.length === 0 ? (
        <GlassCard className="py-12 text-center">
          <p className="text-sm font-medium text-slate-600">
            Nessun premio disponibile al momento.
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Chiedi al Tutor di attivare i premi nello shop.
          </p>
        </GlassCard>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {rewards.map((reward, index) => {
            const canAfford = balance >= reward.cost
            const isPurchasing = purchasingId === reward.id

            return (
              <motion.div
                key={reward.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <GlassCard className="flex h-full flex-col !p-6">
                  <div className="flex items-start gap-4">
                    <RewardIcon reward={reward} />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-semibold text-slate-800">
                        {reward.name}
                      </h3>
                      <p className="mt-1 text-sm font-medium tabular-nums text-amber-800">
                        {reward.cost.toLocaleString('it-IT')} Sesterzi
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePurchase(reward)}
                    disabled={!canAfford || purchasingId !== null}
                    className={[
                      'mt-6 min-h-11 w-full cursor-pointer touch-manipulation rounded-xl border px-4 py-3 text-sm font-semibold shadow-sm transition-all',
                      canAfford
                        ? 'border-amber-600 bg-amber-600 text-white can-hover:hover:bg-amber-700'
                        : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 opacity-60',
                      isPurchasing ? 'pointer-events-none opacity-70' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {isPurchasing ? 'Acquisto…' : 'Acquista'}
                  </button>
                </GlassCard>
              </motion.div>
            )
          })}
        </div>
      )}
    </section>
  )
}
