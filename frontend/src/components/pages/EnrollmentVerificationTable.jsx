import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PencilIcon } from "lucide-react";

function EnrollmentVerificationTable({ schools, onEdit, readOnly }) {
    return (
        <div className="rounded-md border overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="bg-slate-100">
                        <TableHead className="w-[50px]">No.</TableHead>
                        <TableHead className="w-[100px]">Kod</TableHead>
                        <TableHead className="w-[250px]">Nama Sekolah</TableHead>
                        {/* TAMBAH LAJUR PPD */}
                        <TableHead className="w-[150px]">PPD</TableHead>

                        <TableHead className="text-center bg-blue-50">STEM A</TableHead>
                        <TableHead className="text-center bg-blue-50">STEM B</TableHead>
                        <TableHead className="text-center bg-blue-50">STEM C1</TableHead>
                        <TableHead className="text-center bg-blue-50">STEM C2</TableHead>
                        <TableHead className="text-center bg-yellow-50">Kat. E</TableHead>
                        <TableHead className="text-center bg-yellow-50">Kat. F</TableHead>
                        <TableHead className="text-center font-bold">Jum. Murid</TableHead>
                        <TableHead className="text-center font-bold">% STEM</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">Tindakan</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {schools.map((item, index) => {
                        const isPending = item.status === 'Pending Verification';
                        const data = isPending ? item.systemData : item.verifiedData;
                        const safeData = data || {};

                        return (
                            <TableRow key={item._id}>
                                <TableCell className="text-xs text-muted-foreground">{index + 1}</TableCell>
                                <TableCell className="font-mono text-xs">{item.schoolCode}</TableCell>
                                <TableCell>
                                    <div className="font-medium text-sm">{item.schoolName}</div>
                                    <div className="text-[10px] text-muted-foreground">{item.schoolType}</div>
                                </TableCell>

                                {/* PAPAR NAMA PPD */}
                                <TableCell className="text-xs text-muted-foreground">
                                    {item.ppd?.name || "-"}
                                </TableCell>

                                <TableCell className="text-center text-sm">{safeData.stemA}</TableCell>
                                <TableCell className="text-center text-sm">{safeData.stemB}</TableCell>
                                <TableCell className="text-center text-sm">{safeData.stemC1}</TableCell>
                                <TableCell className="text-center text-sm">{safeData.stemC2}</TableCell>

                                <TableCell className="text-center text-sm">{safeData.categoryE}</TableCell>
                                <TableCell className="text-center text-sm">{safeData.categoryF}</TableCell>

                                <TableCell className="text-center font-bold">{safeData.totalStudents}</TableCell>

                                <TableCell className="text-center">
                                    <Badge variant={safeData.stemPercentage >= 40 ? "default" : "destructive"}>
                                        {safeData.stemPercentage?.toFixed(1)}%
                                    </Badge>
                                </TableCell>

                                <TableCell className="text-center">
                                    {item.status === 'Approved by JPN' ? (
                                        <Badge className="bg-green-600 hover:bg-green-700">Lulus JPN</Badge>
                                    ) : item.status === 'Verified by PPD' ? (
                                        <Badge className="bg-blue-600 hover:bg-blue-700">Disahkan</Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-yellow-600 border-yellow-600 bg-yellow-50">Pending</Badge>
                                    )}
                                </TableCell>

                                <TableCell className="text-right">
                                    <Button
                                        size="sm"
                                        variant={isPending ? "default" : "secondary"}
                                        className="flex items-center gap-1"
                                        onClick={() => onEdit(item)}
                                        disabled={item.status === 'Approved by JPN' || readOnly}
                                    >
                                        <PencilIcon className="h-3 w-3" />
                                        {isPending ? "Semak" : "Kemaskini"}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}

export default EnrollmentVerificationTable;