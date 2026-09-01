import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export default function ReferralShare({ code, compact = false }) {
  const [qrImage, setQrImage] = useState('')
  const [status, setStatus] = useState('')
  const referralUrl = code ? `${window.location.origin}/?ref=${encodeURIComponent(code)}` : ''

  useEffect(() => {
    let active = true
    if (!referralUrl) return undefined
    QRCode.toDataURL(referralUrl, {
      width: 512,
      margin: 3,
      errorCorrectionLevel: 'H',
      color: { dark: '#0F0E17', light: '#FFFFFF' },
    }).then(image => { if (active) setQrImage(image) }).catch(() => { if (active) setStatus('QR code could not be generated.') })
    return () => { active = false }
  }, [referralUrl])

  const acknowledge = message => { setStatus(message); window.setTimeout(() => setStatus(''), 2200) }
  const copy = async () => { await navigator.clipboard.writeText(referralUrl); acknowledge('Referral link copied!') }
  const download = () => {
    const link = document.createElement('a')
    link.href = qrImage
    link.download = `tenth-ki-padhai-${code}-qr.png`
    link.click()
    acknowledge('QR code downloaded!')
  }
  const share = async () => {
    try {
      if (navigator.share) {
        const shareData = { title: 'Join me on Tenth Ki Padhai', text: `Use my referral code ${code} to join Tenth Ki Padhai.`, url: referralUrl }
        if (qrImage) {
          const blob = await (await fetch(qrImage)).blob()
          const file = new File([blob], `tenth-ki-padhai-${code}-qr.png`, { type: 'image/png' })
          if (navigator.canShare?.({ files: [file] })) shareData.files = [file]
        }
        await navigator.share(shareData)
      } else {
        await copy()
      }
    } catch (error) {
      if (error.name !== 'AbortError') acknowledge('Unable to share. You can copy the link instead.')
    }
  }

  if (!code) return <div className="text-sm text-ink/55">Your referral code is being prepared. Please refresh shortly.</div>
  return <div className={`grid ${compact ? 'sm:grid-cols-[160px_1fr]' : 'sm:grid-cols-[210px_1fr]'} gap-5 items-center`}>
    <div className="rounded-2xl border-2 border-ink bg-white p-3 shadow-pop mx-auto sm:mx-0 max-w-[230px]">
      {qrImage ? <img src={qrImage} alt={`QR code for referral code ${code}`} className="w-full aspect-square" /> : <div className="aspect-square grid place-items-center text-sm text-ink/50">Generating QR…</div>}
      <div className="text-center border-t border-ink/15 pt-2"><div className="font-display font-extrabold">Tenth Ki Padhai</div><div className="font-mono text-sm tracking-wider">{code}</div></div>
    </div>
    <div className="min-w-0">
      <div className="text-xs font-mono uppercase tracking-wider text-ink/55">Your referral link</div>
      <input className="form-control text-sm" value={referralUrl} readOnly aria-label="Referral URL" />
      <div className="grid sm:grid-cols-3 gap-2 mt-3"><button type="button" className="btn-secondary px-3 py-2" onClick={copy}>Copy link</button><button type="button" className="btn-secondary px-3 py-2" disabled={!qrImage} onClick={download}>Download QR</button><button type="button" className="btn-primary px-3 py-2" onClick={share}>Share</button></div>
      <p className="text-xs text-ink/55 mt-3">Share the image or let someone scan it. Both open the landing page with your referral attached.</p>
      {status && <div className="text-sm font-bold mt-2" role="status">{status}</div>}
    </div>
  </div>
}
